import passport from "passport";
import passportLocal from "passport-local";
import _ from "lodash";

import { User, UserDocument, UserRole } from "../models/User";
import { Request, Response, NextFunction } from "express";
import { sendResponseErrorMsg } from "../util/response";

const LocalStrategy = passportLocal.Strategy;

passport.serializeUser((user: any, done: any) => {
    done(undefined, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err: any, user: unknown) => {
        done(err, user);
    });
});

/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    User.findOne({ email: email.toLowerCase() }, (err: any, user: any) => {
        if (err) {
            return done(err);
        }

        if (!user) {
            return done(undefined, false, { message: `Email ${email} not found.` });
        }

        user.comparePassword(password, (err2: Error, isMatch: boolean) => {
            if (err2) {
                return done(err2);
            }

            if (isMatch) {
                return done(undefined, user);
            }
            return done(undefined, false, { message: "Invalid email or password." });
        });
    });
}));

/**
 * Login Required middleware.
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.json({
        loggedin: false,
        errors: [{
            msg: "Your not logged in"
        }]
    });
};

/**
 * Login Required middleware.
 */
export const isNotAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.json({
        loggedin: true,
        errors: [{
            msg: "Your already logged in"
        }]
    });
};

/**
 * Authorization Required middleware.
 */
export const isAuthorized = (req: Request, res: Response, next: NextFunction) => {
    const provider = req.path.split("/").slice(-1)[0];

    const user = req.user as UserDocument;
    if (_.find(user.tokens, { kind: provider })) {
        next();
    } else {
        res.json({"login-provider": false});
    }
};
