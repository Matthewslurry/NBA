const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const flash = require("connect-flash");
const fs = require("fs");

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
  const axios = require("axios");
  const data = {
    expiry: 5,
    length: 6,
    medium: "sms",
    message: "%otp_code%, is your verification code. Do NOT give it to anyone.",
    number: "233556036088",
    sender_id: "Arkesel",
    type: "numeric",
  };
  const headers = {
    "api-key": "Y3phcXhmbHNNaFlBdEtxTmlhSno",
  };
  axios
    .post("https://sms.arkesel.com/api/otp/generate", data, { headers })
    .then(
      (response) => console.log(response),
      res.redirect("/verifyCode")
    )
    .catch((error) => console.log(error));
});

//Get VerificatonCode
router.get("/verifyCode", function (req, res) {
  res.render("./auth/verifyCode", { title: "verifyCode" });
});

//Verify Code
router.post("/verifyCode", function (req, res) {
  const axios = require("axios");
  const data = {
    api_key: "Y3phcXhmbHNNaFlBdEtxTmlhSno",
    code: `${req.body.otp}`,
    number: "233556036088",
  };
  const headers = {
    "api-key": "Y3phcXhmbHNNaFlBdEtxTmlhSno",
  };
  axios
    .post("https://sms.arkesel.com/api/otp/verify", data, { headers })

    .then((response) => {
      console.log(response);
      if (response.data.code == "1104") {
        req.flash("error_msg", `Invalid Code. Try Again...`);
        res.redirect("/verifyCode");
      } else if (response.data.code == "1105") {
        req.flash("error_msg", `Code has expired`);
        res.redirect("/verifyCode");
      } else if (response.data.code == "1106") {
        req.flash("error_msg", `Internal error`);
        res.redirect("/verifyCode");
      } else {
        res.redirect("/changePassword");
      }
    })
    .catch((error) => {
      console.log(error);
    });
});

//Get changePassword
router.get("/changePassword", function (req, res) {
  res.render("./auth/changePassword", { title: "changePassword" });
   });

   
// LOAD FIRST PAGE CHANGE-PASSWORD FORM
router.get("/changePassword", (req, res) => {
  res.render("changePassword")
});


//POST FIRST CHANGE-PASSWORD FORM FOR FIRST PAGE
router.post("/changePassword", function (req, res) {
const phone = req.body.phone;
let user = {};
const newPassword = req.body.NewPassword;
const confirmpassword = req.body.ConfirmPassword;

user.password = req.body.NewPassword;

  User.findOne({ phone: phone }).then((result) => {
    if (user) { 
  if (newPassword !=  confirmPassword) {
    req.flash("error_msg", `Password Mismatch`);
    res.redirect("/changePassword");
  } else {
    bcrypt.genSalt(10, function (err, salt) {
      bcrypt.hash(user.password, salt, function (err, hash) {
        if (err) {
          console.log(err);
        }
        
        const editedPassword = {
          $set: {
            password: hash,
          },
        };
      
        User.updateOne({ phone: req.user.phone }, editedPassword, function (err) {
          if (err) {
            console.log(err);
            return;
          } else {
            req.flash("success_msg", `Password Changed`);
            res.redirect("/");
          }
        });
      });
    });
  }});
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
      res.redirect("/users/changePassword");
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

router.get("/home", function (req, res) {
  res.render("./user/home", { username: req.user.username });
});

router.get("/write-note", function (req, res) {
  res.render("./user/write-note");
});

//Note-saving Process
router.post("/write-note", function (req, res) {
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
router.get("/mynotes", (req, res) => {
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
router.get("/note/:id", (req, res) => {
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
router.get("/users/edit/:id", (req, res) => {
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
router.post("/users/edit/:id", function (req, res) {
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
router.delete("/users/note/:id", (req, res) => {
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
router.get("/update-details", (req, res) => {
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

router.post("/update-details", function (req, res) {
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
router.get("/change-password", (req, res) => {
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
router.post("/change-password", function (req, res) {
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
