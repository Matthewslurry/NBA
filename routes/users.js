const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const flash = require("connect-flash");
const fs = require("fs");

let User = require("../models/user");
const all = require("../models/note");
const { response } = require("express");


//Login Form
router.get("/", function (req, res) {
    res.render("./auth/login", { title: "login" });
  });
  


  module.exports = router;