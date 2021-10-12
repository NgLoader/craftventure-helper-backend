import express from "express";
import compression from "compression";  // compresses requests
import session from "express-session";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";
import path from "path";
import mongoose from "mongoose";
import mongo from "connect-mongo";
import passport from "passport";
import lusca from "lusca";
import cors from "cors";
import { MONGODB_URI, RATE_LIMIT_MAX, RATE_LIMIT_WINDOWMS, SESSION_SECRET, CROS_ORIGIN } from "./util/secrets";
import { UserRoute } from "./controllers/user";
import { SettingRoute } from "./controllers/setting";
import { ContentRoute } from "./controllers/content/content";

const MongoStore = mongo(session);

// Create Express server
const app = express();

// Connect to MongoDB
const mongoUrl = MONGODB_URI;

mongoose.connect(mongoUrl, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true }).catch(err => {
    console.log(`MongoDB connection error. Please make sure MongoDB is running. ${err}`);
    process.exit();
});

// Express configuration
app.set("port", process.env.PORT || 3000);
app.use(rateLimit({
    windowMs: Number(RATE_LIMIT_WINDOWMS),
    max: Number(RATE_LIMIT_MAX)
}));
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: CROS_ORIGIN,
    credentials: true
}));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: SESSION_SECRET,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7
    },
    store: new MongoStore({
        url: mongoUrl,
        autoReconnect: true
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

app.use(
    express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

UserRoute.init(app);
ContentRoute.init(app);
SettingRoute.init(app);

export default app;