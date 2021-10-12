/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { User, UserDocument } from "../models/User";
import { Request, Response, NextFunction, Application } from "express";
import { IVerifyOptions } from "passport-local";
import { check, validationResult } from "express-validator";
import "../config/passport";
import * as passportConfig from "../config/passport";
import passport from "passport";
import { $$iterator } from "rxjs/internal/symbol/iterator";

export class UserRoute {

    static init(app: Application) {
        app.post("/api/account/login", passportConfig.isNotAuthenticated, UserRoute.postLogin);
        app.post("/api/account/logout", passportConfig.isAuthenticated, UserRoute.postLogout);
        app.post("/api/account/logout/check", passportConfig.isAuthenticated, UserRoute.postLogoutCheck);
        app.post("/api/account/create", passportConfig.isAuthenticated, UserRoute.postSignup);
        app.post("/api/account/update", passportConfig.isAuthenticated, UserRoute.postUpdateProfile);
        app.post("/api/account/update/password", passportConfig.isAuthenticated, UserRoute.postUpdatePassword);
        app.post("/api/account/delete", passportConfig.isAuthenticated, UserRoute.postDeleteAccount);
    }

    /**
    * Sign in using email and password.
    * @route POST /login
    */
    private static async postLogin(req: Request, res: Response, next: NextFunction) {
        await check("email", "Email is not valid").isEmail().run(req);
        await check("password", "Password cannot be blank").isLength({ min: 1 }).run(req);
        await check("email").normalizeEmail({ gmail_remove_dots: false }).run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.json({
                loggedin: false,
                errors: errors.array()
            });
            return;
        }

        passport.authenticate("local", (err: Error, user: UserDocument, info: IVerifyOptions) => {
            if (err) {
                return next(err);
            }

            if (!user) {
                res.json({
                    loggedin: false,
                    errors: [{
                        msg: info.message
                    }]
                });
                return;
            }

            req.logIn(user, (err2) => {
                if (err2) {
                    return next(err2);
                }

                res.json({ loggedin: true });
            });
        })(req, res, next);
    }

    /**
     * Log out.
     * @route POST /logout
     */
    private static postLogout(req: Request, res: Response) {
        req.logout();
        res.json({ loggedin: false });
    }


    /**
     * Check if logged out.
     * @route POST /logout
     */
    private static postLogoutCheck(req: Request, res: Response) {
        res.json({ loggedin: true });
    }

    /**
     * Create a new local account.
     * @route POST /signup
     */
    private static async postSignup(req: Request, res: Response, next: NextFunction) {
        await check("name", "Username must be least 4 character long").isLength({ min: 4, max: 16 }).run(req);
        await check("email", "Email is not valid").isEmail().run(req);
        await check("password", "Password must be at least 4 characters long").isLength({ min: 4 }).run(req);
        await check("confirmPassword", "Passwords do not match").equals(req.body.password).run(req);
        await check("email").normalizeEmail({ gmail_remove_dots: false }).run(req);

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            res.json({
                loggedin: false,
                errors: errors.array()
            });
            return;
        }

        const user = new User({
            email: req.body.email,
            password: req.body.password,
            profile: {
                name: req.body.name
            }
        });

        User.findOne({ email: req.body.email }, (err, existingUser) => {
            if (err) { return next(err); }
            if (existingUser) {
                res.json({
                    loggedin: false,
                    error: {
                        msg: "Account with that email address already exists."
                    }
                });
                return;
            }
            user.save((err2) => {
                if (err2) { return next(err2); }
                req.logIn(user, (err3) => {
                    if (err3) {
                        return next(err3);
                    }
                    res.json({ loggedin: true });
                });
            });
        });
    }

    /**
     * Update profile information.
     * @route POST /account/profile
     */
    private static async postUpdateProfile(req: Request, res: Response, next: NextFunction) {
        await check("email", "Please enter a valid email address.").isEmail().run(req);
        await check("email").normalizeEmail({ gmail_remove_dots: false }).run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.json({
                success: false,
                errors: errors.array()
            });
            return;
        }

        const userDoc = req.user as UserDocument;
        User.findById(userDoc.id, (err, user: UserDocument) => {
            if (err) {
                return next(err);
            }

            user.email = req.body.email || "";
            user.profile.name = req.body.name || "";

            user.save((err2: any) => {
                if (err2) {
                    if (err2.code === 11000) {
                        res.json({
                            success: false,
                            errors: {
                                msg: "The email address you have entered is already associated with an account."
                            }
                        });
                        return next();
                    }
                    return next(err2);
                }

                res.json({ success: true });
            });
        });
    }

    /**
     * Update current password.
     * @route POST /account/password
     */
    private static async postUpdatePassword(req: Request, res: Response, next: NextFunction) {
        await check("password", "Password must be at least 4 characters long").isLength({ min: 4 }).run(req);
        await check("confirmPassword", "Passwords do not match").equals(req.body.password).run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.json({
                success: false,
                errors: errors.array()
            });
            return;
        }

        const userDoc = req.user as UserDocument;
        User.findById(userDoc.id, (err, user: UserDocument) => {
            if (err) { return next(err); }
            user.password = req.body.password;
            user.save((err2: any) => {
                if (err2) {
                    return next(err2);
                }

                res.json({ success: true });
            });
        });
    }

    /**
     * Delete user account.
     * @route POST /account/delete
     */
    private static postDeleteAccount(req: Request, res: Response, next: NextFunction) {
        const user = req.user as UserDocument;
        User.remove({ _id: user.id }, (err) => {
            if (err) {
                return next(err);
            }

            req.logout();
            res.json({ success: true });
        });
    }
}