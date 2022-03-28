const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const fileupload = require('express-fileupload');
const session = require("express-session");
const config = require('./config/database');
const flash = require("connect-flash");
const bycrpt = require("bcryptjs");
const parser = require("body-parser");





const app = express();

require("./config/passport")(passport);

//DB Connection
mongoose.connect(config.database,{useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connection.once('open', function(){
    console.log('Connected to MongoDB');
}).on('error', function(error){
    console.log('Connectoin error.', error);
}) 

app.set("view engine", "ejs");
app.use(express.urlencoded({extended: false}));
app.use(express.json());

//session
app.use(session({
  secret: 'my secret',
  resave: true,
  saveUninitialized: true
}));

app.use(flash());
  // Global Variables
  app.use((req, res, next) => {
    res.locals.success_msg = req.flash("success_msg");
    res.locals.error_msg = req.flash("error_msg");
    res.locals.error = req.flash("error");
    next();
  });
  


app.use(fileupload());
//Passport MiddleWare
app.use(passport.initialize());
app.use(passport.session());


app.use(express.static("public"));
const PORT = process.env.PORT || 5000 ;

// Require Routes
const users = require('./routes/users')
app.use('/', users);




app.use(function(req, res, next){ 
  res.status(404).render('./error-404')
});
  

 

app.listen(PORT, function (req, res) {
  console.log("server starting on port 5000...");
});

