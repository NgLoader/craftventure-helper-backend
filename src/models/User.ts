/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcrypt-nodejs";
import mongoose from "mongoose";

export enum UserRole {
    ADMIN = "ADMIN",
    EDITOR = "EDITOR",
    USER = "USER"
}

export type UserDocument = mongoose.Document & {
    email: string;
    password: string;

    role: UserRole;

    tokens: AuthToken[]

    profile: {
        name: string;
    };

    comparePassword: comparePasswordFunction;
    gravatar: (size: number) => string;
};

type comparePasswordFunction = (candidatePassword: string, cb: (err: any, isMatch: any) => any) => void;

export interface AuthToken {
    accessToken: string;
    kind: string;
}

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true
    },
    password: String,
    role: {
        type: String,
        enum: UserRole,
        default: UserRole.USER
    },

    tokens: Array,

    profile: {
        name: String
    }
}, {
    timestamps: true
});

/**
 * Password hash.
 */
UserSchema.pre("save", function save(next) {
    const user = this as UserDocument;
    if (!user.isModified("password")) {
        return next();
    }

    bcrypt.genSalt(10, (err, salt) => {
        if (err) {
            return next(err);
        }

        bcrypt.hash(user.password, salt, undefined, (err2: mongoose.Error, hash) => {
            if (err2) {
                return next(err2);
            }

            user.password = hash;
            next();
        });
    });
});

const comparePassword: comparePasswordFunction = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err: mongoose.Error, isMatch: boolean) => {
        cb(err, isMatch);
    });
};

UserSchema.methods.comparePassword = comparePassword;

export const User = mongoose.model<UserDocument>("user", UserSchema);