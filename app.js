
if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}
// This event is only for increasing limit
require('events').EventEmitter.defaultMaxListeners = 20;

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");


const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const Listings = require('./models/listing.js');

const dbUrl = process.env.ATLASDB_URL;

main().then(() => {
    console.log("connected to DB");
}).catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(dbUrl);
}

// Paths for connecting other paths
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
});

store.on('error', () => {
    console.log("ERROR IN MONGO SESSION-STORE", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        emaxAge: Date.now() + 7 * 24 * 60 * 60 * 1000,
        httpOnly: true //this for security purpose
    },
};

// Root
// app.get("/", (req, res) => {
//     res.send("hi,I am root and Its working !!")
// });



// session and flash
app.use(session(sessionOptions));
app.use(flash());


// Passport for authentication
passport.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// implementation of flash
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});




// accessed listings
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// search button
app.get("/listings/search/:searchValue", async (req, res, next) => {
    const searchTerm = req.query.searchTerm;
    const query = {
        $or: [
            { title: new RegExp(searchTerm, 'i') },
            { location: new RegExp(searchTerm, 'i') },
            { country: new RegExp(searchTerm, 'i') },
            { description: new RegExp(searchTerm, 'i') }
        ]
    };
    try {

        const allListings = await Listings.find(query);
        res.render("listings/index.ejs", { allListings });
    } catch (error) {
        next(error);
    }

})


app.get("/listings", async (req, res) => {
    let search = req.query.data;
    let filterListing = await Listing.find({ title: search })
    console.log(filterListing);


});

// filter search
app.get("/listings/category/:searchValue", async (req, res) => {
    const searchTerm = req.query.search;
    const query = {
        $or: [
            { title: new RegExp(searchTerm, 'i') },
            { location: new RegExp(searchTerm, 'i') },
            { country: new RegExp(searchTerm, 'i') },
            { description: new RegExp(searchTerm, 'i') }
        ]
    };
    try {

        const allListings = await Listings.find(query);
        res.render("listings/index.ejs", { allListings });
    } catch (error) {
        next(error);
    }

});



// ......Handling Error........
app.all("*", (req, res, next) => {
    next(new ExpressError(404, "Page not found !"))
})

// ......Express Error......
app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong!!" } = err;
    res.status(statusCode).render("error.ejs", { message });
    // res.status(statusCode).send(message);
});

// Port 
app.listen(8080, () => {
    console.log("port is working");
});
