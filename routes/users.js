const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const flash = require("connect-flash");
const axios = require("axios");
const fs = require("fs");
const { ensureAuthenticated } = require("../config/ensureauthenticated");

let User = require("../models/user");
const Note = require("../models/note");
const { response } = require("express");

//Login Form
router.get("/", function (req, res) {
  res.render("./auth/login", { title: "login" });
});

//Get ForgotPassword
router.get("/forgotPassword", function (req, res) {
  res.render("./auth/forgotPassword", { title: "forgotPassword" });
});

//Create verification code
router.post("/forgotPassword", function (req, res) {
  User.findOne({ phone: req.body.phone }).then((user) => {
    if (user) {
      const data = {
        expiry: 5,
        length: 6,
        medium: "sms",
        message: `Hello ${user.name}, %otp_code% is your verification code. Do not share this with anyone.`,
        number: req.body.phone,
        sender_id: "NoteBookApp",
        type: "numeric",
      };
      const headers = {
        "api-key": "Y3phcXhmbHNNaFlBdEtxTmlhSno",
      };
      axios
        .post("https://sms.arkesel.com/api/otp/generate", data, { headers })
        .then(
          (response) => console.log(response),
          // Pass the number as a query to the verify code route
          res.redirect(`/verifyCode?phone=${req.body.phone}&s=${user._id}`)
        );
    } else {
      req.flash("error_msg", "Phone number not registered");
      res.redirect("/forgotPassword");
    }
  });
});

//Get VerificatonCode
router.get("/verifyCode", function (req, res) {
  const phone = req.query.phone;
  const userId = req.query.s; // I used 's' because I didn't want users to understand what it is
  res.render("./auth/verifyCode", {
    title: "verifyCode",
    phone: phone, // Passed the phone number to the page here
    userId: userId, // Passed the user's ID to the page here
  });
});

//Verify Code
router.post("/verifyCode", function (req, res) {
  try {
    const data = {
      api_key: "Y3phcXhmbHNNaFlBdEtxTmlhSno",
      code: `${req.body.otp}`,
      number: req.body.phone, // Getting back the phone number for the verification here.
    };
    const headers = {
      "api-key": "Y3phcXhmbHNNaFlBdEtxTmlhSno",
    };
    axios
      .post("https://sms.arkesel.com/api/otp/verify", data, { headers })

      .then((response) => {
        if (response.data.code == "1104") {
          req.flash("error_msg", `Invalid Code. Try Again...`);
          res.redirect(`/verifyCode?phone=${req.body.phone}`);
        } else if (response.data.code == "1105") {
          req.flash("error_msg", `OTP expired. Please request for a new one.`);
          res.redirect("/forgotPassword");
        } else if (response.data.code == "1106") {
          req.flash("error_msg", `Internal error`);
          res.redirect("/forgotPassword");
        } else {
          res.redirect(`/changePassword?data=${req.body.data}`); // Passing the user Id as the query
          // I used data so that people will not be able to know that it's the user's ID
        }
      })
      .catch((error) => {
        req.flash("error_msg", `Error encounted, try agin..`);
        res.redirect("/");
      });
  } catch (error) {
    req.flash("error_msg", `Error encounted, try agin..`);
    res.redirect("/");
  }
});

//Get changePassword
router.get("/changePassword", function (req, res) {
  const userId = req.query.data;
  res.render("./auth/changePassword", {
    title: "changePassword",
    userId: userId,
  });
});

//POST FIRST CHANGE-PASSWORD FORM FOR FIRST PAGE
router.post("/changePassword", function (req, res) {
  const userId = req.body.data;
  const newPassword = req.body.NewPassword;
  const confirmPassword = req.body.ConfirmPassword;
  try {
    User.findOne({ _id: userId }).then((user) => {
      // If user is found
      if (user) {
        if (newPassword != confirmPassword) {
          req.flash("error_msg", `Password mismatch`);
          res.redirect(`/changePassword?data=${req.body.data}`);
        } else {
          bcrypt.genSalt(10, function (err, salt, isMatch) {
            bcrypt.hash(newPassword, salt, function (err, hash) {
              if (err) {
                console.log(err);
              }

              const editedPassword = {
                $set: {
                  password: hash,
                },
              };

              User.updateOne({ _id: userId }, editedPassword)
                .then((edited) => {
                  if (edited) {
                    req.flash("success_msg", `Password updated successfully`);
                    res.redirect("/");
                  } else {
                    req.flash("error_msg", `Error updating password`);
                    res.redirect("/forgotPassword");
                  }
                })
                .catch((error) => {
                  req.flash("error_msg", `Error encounted, try agin..`);
                  res.redirect("/forgotPassword");
                });
            });
          });
        }
      } else {
        // If user is not found
        req.flash(
          "error_msg",
          `Error updating your password. Please try again`
        );
        res.redirect("/forgotPassword");
      }
    });
  } catch (error) {
    req.flash("error_msg", `Error updating your password. Please try again`);
    res.redirect("/forgotPassword");
  }
});

//Get RegistrationPage
router.get("/register", function (req, res) {
  res.render("./auth/register", { title: "Register" });
});

//Registeration Process
router.post("/register", function (req, res) {
  User.findOne({ phone: req.body.phone }).then((user) => {
    if (user) {
      console.log("Phone number already exists");
      req.flash("error_msg", "Phone number already exists");
      res.redirect("/register");
    } else {
      let user = new User();

      user.name = req.body.name;
      user.email = req.body.email;
      user.phone = req.body.phone;
      user.username = req.body.username;
      user.password = req.body.password;

      bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(user.password, salt, function (err, hash) {
          if (err) {
            console.log(err);
          }
          user.password = hash;
          user.save(function (err) {
            if (err) {
              console.log(err);
              return;
            } else {
              req.flash(
                "success_msg",
                `You are successfully registered and can Login`
              );
              res.redirect("/");
            }
          });
        });
      });
    }
  });
});

//Login Process
router.post("/", function (req, res, next) {
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/",
    failureFlash: true,
  })(req, res, next);
});

router.get("/home", ensureAuthenticated, function (req, res) {
  res.render("./user/home", { username: req.user.username });
});

router.get("/write-note", ensureAuthenticated, function (req, res) {
  res.render("./user/write-note");
});

//Note-saving Process
router.post("/write-note", ensureAuthenticated, function (req, res) {
  if (req.files != null) {
    const image = req.files.documentimage;
    image.mv("public/documentimages/" + image.name, function (error) {
      if (error) {
        console.log("Error encountered while uploading image");
      } else {
        console.log("Image uploaded successfully");
      }
    });

    let note = new Note({
      title: req.body.title,
      body: req.body.body,
      image: image.name,
      timeAdded:
        new Date().toLocaleTimeString() +
        " on " +
        new Date().toLocaleDateString(),
    });

    note.save(function (err) {
      if (err) {
        console.log(err);
        return;
      } else {
        req.flash("success_msg", `Saved successfully`);
        res.redirect("/write-note");
      }
    });
  } else {
    let note = new Note({
      title: req.body.title,
      body: req.body.body,
      image: "empty",

      timeAdded:
        new Date().toLocaleTimeString() +
        " on " +
        new Date().toLocaleDateString(),
    });

    note.save(function (err) {
      if (err) {
        console.log(err);
        return;
      } else {
        req.flash("success_msg", `Saved successfully`);
        res.redirect("/write-note");
      }
    });
  }
});

// GET ALL NOTES
router.get("/mynotes", ensureAuthenticated, (req, res) => {
  Note.find()
    .sort({ createdAt: -1 })
    .then((result) => {
      res.render("./user/all-note", { notes: result });
    })
    .catch((err) => {
      console.log(err);
    });
});

//DISPLAY A NOTE BY ID
router.get("/note/:id", ensureAuthenticated, (req, res) => {
  const id = req.params.id;
  Note.findById(id)
    .then((result) => {
      res.render("./user/details", { note: result });
    })
    .catch((err) => {
      console.log(err);
    });
});

//EDIT NOTE
router.get("/users/edit/:id", ensureAuthenticated, (req, res) => {
  const id = req.params.id;
  Note.findById(id)
    .then((result) => {
      res.render("./user/edit-note", { note: result });
    })
    .catch((err) => {
      console.log(err);
    });
});

//Updating Note
router.post("/users/edit/:id", ensureAuthenticated, function (req, res) {
  if (req.files != null) {
    const image = req.files.documentimage;
    image.mv("public/documentimages/" + image.name, function (error) {
      if (error) {
        console.log("Error encountered while uploading image");
      } else {
        console.log("Image uploaded successfully");
      }
    });

    const note = {
      $set: {
        title: req.body.title,
        body: req.body.body,
        image: image.name,
      },
    };

    Note.updateOne({ _id: req.params.id }, note, function (err, success) {
      if (err) {
        console.log(err);
        return;
      } else {
        req.flash("success_msg", `Updated successfully`);
        res.redirect("/mynotes");
      }
    });
  } else {
    const note = {
      $set: {
        title: req.body.title,
        body: req.body.body,
      },
    };

    Note.updateOne({ _id: req.params.id }, note, function (err, success) {
      if (err) {
        console.log(err);
        return;
      } else {
        req.flash("success_msg", `Updated successfully`);
        res.redirect("/mynotes");
      }
    });
  }
});

//DELETING A NOTE BY ID
router.delete("/users/note/:id", ensureAuthenticated, (req, res) => {
  const id = req.params.id;
  Note.findByIdAndDelete(id)
    .then((result) => {
      req.flash("success_msg", `Deleted Successfully`);
      res.json({ redirect: "/mynotes" });
    })
    .catch((err) => {
      console.log(err);
    });
});

//ACCESS CONTROL
// function ensureAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) {
//     return next();
//   } else {
//     req.flash("error_msg", `Please login first`);
//     res.redirect("/");
//   }
// }

// LOGOUT
router.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

//LOAD EDIT FORM
router.get("/update-details", ensureAuthenticated, (req, res) => {
  const username = req.user.username;
  const phone = req.user.phone;
  User.findOne({ phone: phone }).then((result) => {
    if (result) {
      res.render("./user/update-details", {
        user: result,
        username: username,
      });
    } else {
      res.render("./user/write-note", {
        user: result,
        username: username,
      });
      console.log("No result found");
    }
  });
});

router.post("/update-details", ensureAuthenticated, function (req, res) {
  let user = {};

  user.name = req.body.name;
  user.email = req.body.email;
  user.phone = req.body.phone;
  user.username = req.body.username;
  // user.password = req.body.password;

  let query = { phone: req.user.phone };

  User.updateOne(query, user, function (err) {
    if (err) {
      console.log(err);
      return;
    } else {
      req.flash("success_msg", ` Details Updated successfully`);
      res.redirect("/write-note");
    }
  });
});

// LOAD CHANGE-PASSWORD FORM
router.get("/change-password", ensureAuthenticated, (req, res) => {
  const username = req.user.username;
  const phone = req.user.phone;
  User.findOne({ phone: phone }).then((result) => {
    if (result) {
      res.render("./user/change-password", {
        user: result,
        username: username,
      });
    } else {
      res.render("./user/change-password", {
        user: result,
        username: username,
      });
      console.log("No result found");
    }
  });
});

// POST UPDATED PASSWORD
router.post("/change-password", ensureAuthenticated, function (req, res) {
  try {
    let user = {};

    // Match Password
    bcrypt.compare(req.body.oldPassword, req.user.password, (err, isMatch) => {
      if (err) {
        res.render("./user/write-note", {
          message: `Bcrypt error.. Try again later`,
          name: req.user.name,
          email: req.user.email,
          username: req.user.username,
          password: req.user.password,
          phone: req.user.phone,
          // user_id: req.user._id,
        });
      }
      if (isMatch) {
        // Check new password and confirm password match
        if (req.body.newPassword != req.body.confirmpassword) {
          errors.push({ message: "Passwords do not match" });
        } else {
          // Hash Password using BcryptJs
          bcrypt.genSalt(10, (err, salt, isMatch) =>
            // Hash Password
            bcrypt.hash(req.body.newPassword, salt, (err, hash) => {
              if (err) {
                res.render("/", {
                  name: req.user.name,
                  email: req.user.email,
                  username: req.user.username,
                  password: req.user.password,
                  user_id: req.user._id,
                  message: `Bcrypt error.. Try again later`,
                });
              }
              // Set Password to Hash
              const editedPassword = {
                $set: {
                  password: hash,
                },
              };

              // Update Password in Database
              User.updateOne({ phone: req.user.phone }, editedPassword)
                .then((edited) => {
                  if (edited) {
                    req.flash("success_msg", `Password changed successfully`);
                    res.redirect("/");
                  } else {
                    req.flash("error_msg", `Error updating details`);
                    res.redirect("/write-note");
                  }
                })
                .catch((error) => {
                  req.flash("error_msg", `Error updating details`);
                  res.redirect("/write-note");
                });
            })
          );
        }
      } else {
        req.flash("error_msg", `Incorrect Password`);
        res.redirect("/write-note");
      }
    });
  } catch (error) {
    req.flash("error_msg", `Error encounted. Try logging in again`);
    res.redirect("/");
  }
});

module.exports = router;
