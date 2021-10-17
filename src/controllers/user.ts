/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { User, UserDocument, UserRole } from "../models/User";
import { Request, Response, NextFunction, Application } from "express";
import { IVerifyOptions } from "passport-local";
import { check, validationResult } from "express-validator";
import "../config/passport";
import * as passportConfig from "../config/passport";
import passport from "passport";
import { sendResponseError, sendResponseErrorMsg, sendResponseSuccess } from "../util/response";
import { Types } from "mongoose";

export class UserRoute {

    static init(app: Application) {
        app.post("/account/login", passportConfig.isNotAuthenticated, UserRoute.postLogin);
        app.post("/account/logout", passportConfig.isAuthenticated, UserRoute.postLogout);
        app.post("/account/logout/check", passportConfig.isAuthenticated, UserRoute.postLogoutCheck);
        app.post("/account/create", passportConfig.isAuthenticated, UserRoute.postSignup);
        app.post("/account/update", passportConfig.isAuthenticated, UserRoute.postUpdateProfile);
        app.post("/account/update/password", passportConfig.isAuthenticated, UserRoute.postUpdatePassword);
        app.post("/account/delete", passportConfig.isAuthenticated, UserRoute.postDeleteAccount);
        app.post("/account/search", passportConfig.isAuthenticated, UserRoute.postSearchAccount);
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
            sendResponseError(res, errors);
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
        await check("email", "Email is not valid").isEmail().normalizeEmail({ gmail_remove_dots: false }).run(req);
        await check("role", "Role is not valid").custom((input) => input as keyof UserRole).run(req);
        await check("password", "Password must be at least 8 characters long").isLength({ min: 8 }).run(req);
        await check("confirmPassword", "Passwords do not match").equals(req.body.password).run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            sendResponseError(res, errors);
            return;
        }

        const userDoc = req.user as UserDocument;
        if (userDoc.role != UserRole.ADMIN) {
            sendResponseErrorMsg(res, "You don't have permission to performe this command");
            return;
        }

        User.findOne({ email: req.body.email }, (err, existingUser) => {
            if (err) { return next(err); }
            if (existingUser) {
                sendResponseError(res, [{ msg: "Account with that email address already exists." }]);
                return;
            }

            const user = new User({
                email: req.body.email,
                password: req.body.password,
                role: req.body.role as keyof UserRole,
                profile: {
                    name: req.body.name
                }
            });

            user.save((err2) => {
                if (err2) {
                    return next(err2);
                }
                sendResponseSuccess(res);
            });
        });
    }

    /**
     * Update profile information.
     * @route POST /account/profile
     */
    private static async postUpdateProfile(req: Request, res: Response, next: NextFunction) {
        await check("id", "Must be a user id").custom(value => Types.ObjectId.isValid(value)).run(req);
        await check("email", "Must be a number and between 1 and 100").optional().isEmail().normalizeEmail({ gmail_remove_dots: false }).run(req);
        await check("name", "Name length must be higher then 4 and lower 16").optional().isLength({ min: 4, max: 16 }).run(req);
        await check("role", "Role is not valid").optional().custom((input) => input as keyof UserRole).run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            sendResponseError(res, errors);
            return;
        }

        const userDoc = req.user as UserDocument;
        if (userDoc.role != UserRole.ADMIN && userDoc.id != req.body.id) {
            sendResponseErrorMsg(res, "You don't have permission to performe this command");
            return;
        }

        User.findById({ _id: req.body.id }, (err, user: UserDocument) => {
            if (err) {
                return next(err);
            }

            user.email = req.body.email || user.email;
            user.role = userDoc.role == UserRole.ADMIN ? req.body.role as UserRole || user.role : user.role;
            user.profile.name = req.body.name || user.profile.name;

            user.save((err2: any, result: UserDocument) => {
                if (err2) {
                    if (err2.code === 11000) {
                        sendResponseErrorMsg(res, "The email address you have entered is already associated with an account.");
                        return next();
                    }
                    return next(err2);
                }

                if (!result) {
                    sendResponseErrorMsg(res, "Id was not found.");
                    return;
                }

                sendResponseSuccess(res);
            });
        });
    }

    /**
     * Update current password.
     * @route POST /account/password
     */
    private static async postUpdatePassword(req: Request, res: Response, next: NextFunction) {
        await check("id", "Must be a user id").custom(value => Types.ObjectId.isValid(value)).run(req);
        await check("password", "Password must be at least 8 characters long").isLength({ min: 8 }).run(req);
        await check("confirmPassword", "Passwords do not match").equals(req.body.password).run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            sendResponseError(res, errors);
            return;
        }

        const userDoc = req.user as UserDocument;
        if (userDoc.role != UserRole.ADMIN && userDoc.id != req.body.id) {
            sendResponseErrorMsg(res, "You don't have permission to performe this command");
            return;
        }

        User.findById({ _id: req.body.id }, (error, user: UserDocument) => {
            if (error) {
                return next(error);
            }

            user.password = req.body.password;
            user.save((err2: any, result: UserDocument) => {
                if (err2) {
                    return next(err2);
                }

                if (!result) {
                    sendResponseErrorMsg(res, "Id was not found.");
                    return;
                }

                sendResponseSuccess(res);
            });
        });
    }

    /**
     * Delete user account.
     * @route POST /account/delete
     */
    private static async postDeleteAccount(req: Request, res: Response, next: NextFunction) {
        await check("id", "Must be a user id").custom(value => Types.ObjectId.isValid(value)).run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            sendResponseError(res, errors);
            return;
        }

        const userDoc = req.user as UserDocument;
        if (userDoc.role != UserRole.ADMIN && userDoc.id != req.body.id) {
            sendResponseErrorMsg(res, "You don't have permission to performe this command");
            return;
        }

        User.deleteOne({ _id: req.body.id }, (error) => {
            if (error) {
                return next(error);
            }

            sendResponseSuccess(res);
        });
    }

    /**
     * Search user account.
     * @route POST /account/search
     */
    private static async postSearchAccount(req: Request, res: Response, next: NextFunction) {
        await check("limit", "Must be a number and between 1 and 100").optional().isNumeric().isLength({ min: 1, max: 100 }).run(req);
        await check("sort", "Only _id, role, createdAt or updatedAt allowed").optional().matches(new RegExp("(?:^|\W)(createdAt|updatedAt|_id|role)(?:$|\W)")).run(req);
        await check("order", "Only desc or asc allowed").optional().matches(new RegExp("(?:^|\W)(desc|asc)(?:$|\W)")).run(req);
        await check("page", "Must be a number and higher than zero").optional().isNumeric().isLength({ min: 1 }).run(req);

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            sendResponseError(res, errors);
            return;
        }

        const userDoc = req.user as UserDocument;
        if (userDoc.role != UserRole.ADMIN) {
            sendResponseErrorMsg(res, "You don't have permission to performe this command");
            return;
        }

        User.countDocuments({}, (error, total_count) => {
            if (error) {
                return next(error);
            }

            const limit = req.body.limit || 10;
            const sort = req.body.sort || "createdAt";
            const order = (req.body.order || "") === "asc" ? 1 : -1;
            const page = req.body.page || 0;

            User.find((error2, result) => {
                if (error2) {
                    return next(error2);
                }

                const results: any[] = [];
                result.forEach((element) => {
                    results.push({
                        "id": element._id,
                        "email": element.email,
                        "role": element.role,
                        "profile": element.profile,
                        "createdAt": (element as any).createdAt,
                        "updatedAt": (element as any).updatedAt
                    });
                });

                sendResponseSuccess(res, {
                    users: results,
                    total_count
                });
            }).sort({ [sort]: order }).skip(limit * page).limit(limit);
        });
    }
}