import Grid from "gridfs-stream";
import { GridFsStorage } from "multer-gridfs-storage";
import crypto from "crypto";
import multer from "multer";
import mongoose, { Error, isValidObjectId, Mongoose, Types } from "mongoose";
import { Application, NextFunction, Request, Response } from "express";
import * as passportConfig from "../config/passport";
import { sendResponseError, sendResponseErrorMsg, sendResponseSuccess } from "../util/response";
import { GridFSBucket } from "mongodb";
import { check, validationResult } from "express-validator";
import { UserDocument, UserRole } from "../models/User";
import { Image, ImageDocument } from "../models/Image";

export class ImageRoute {

    private static gridfsBucket: GridFSBucket;
    private static upload: multer.Multer;

    static async init(app: Application) {
        await mongoose.connection;
        ImageRoute.gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            chunkSizeBytes: 1024,
            bucketName: "images"
        });
        
        ImageRoute.upload = multer({
            storage: new GridFsStorage({
                db: mongoose.connection.db,
                file: (req, file) => {
                    return new Promise((resolve, reject) => {
                        crypto.randomBytes(8, (error, buffer) => {
                            if (error) {
                                return reject(error);
                            }

                            const fileInfo = {
                                filename: new Date().getTime().toString(36) + new Date().getUTCMilliseconds() + buffer.toString("hex"),
                                bucketName: "images"
                            };
                            resolve(fileInfo);
                        });
                    });
                }
            }),
            fileFilter: (req, file, callback) => {
                console.log(file);
                callback(null, true);
            }
        });

        app.post("/api/images", passportConfig.isAuthenticated, ImageRoute.postImage);
        app.post("/api/images/search", passportConfig.isAuthenticated, ImageRoute.searchImage);
        app.post("/api/images/delete", passportConfig.isAuthenticated, ImageRoute.deleteImage);
        app.get("/api/image/:filename", ImageRoute.getImage);
    }

    private static async postImage(req: Request, res: Response, next: NextFunction) {
        ImageRoute.upload.array("img", 10)(req, res, error => {
            if (error instanceof multer.MulterError) {
                sendResponseErrorMsg(res, error.code);
            } else if (error) {
                return next(error);
            } else {
                res.send(req.files);
            }
        });
    }

    private static async getImage(req: Request, res: Response, next: NextFunction) {
        ImageRoute.gridfsBucket.find({ filename: req.params.filename }).toArray((error, files) => {
            if (error) {
                return next(error);
            }

            if (files.length == 0) {
                sendResponseErrorMsg(res, "No file found");
                return;
            }

            ImageRoute.gridfsBucket.openDownloadStream(files[0]._id)
            .on("data", chunk => res.write(chunk))
            .on("end", () => res.status(200).end())
            .on("error", error => {
                if ((error as any).code === "ENOENT") {
                    sendResponseErrorMsg(res, "No file found");
                } else {
                    next(error);
                }
            });
        });
    }

    private static async searchImage(req: Request, res: Response, next: NextFunction) {
        await check("limit", "Must be a number and between 1 and 100").optional().isNumeric().isLength({ min: 1, max: 100 }).run(req);
        await check("sort", "Only _id, name, contentType, length or uploadDate allowed").optional().matches(new RegExp("(?:^|\W)(name|contentType|length|uploadDate|_id)(?:$|\W)")).run(req);
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

        Image.countDocuments({}, (error: any, total_count: number) => {
            if (error) {
                return next(error);
            }

            const limit = req.body.limit || 10;
            const sort = req.body.sort || "uploadDate";
            const order = (req.body.order || "") === "asc" ? 1 : -1;
            const page = req.body.page || 0;

            Image.find((error2: any, result: ImageDocument[]) => {
                if (error2) {
                    return next(error2);
                }

                const results: any[] = [];
                result.forEach((element) => {
                    results.push({
                        "id": element._id,
                        "length": element.length,
                        "chunkSize": element.chunkSize,
                        "filename": element.filename,
                        "contentType": element.contentType,
                        "uploadDate": (element as any).uploadDate
                    });
                });

                sendResponseSuccess(res, {
                    images: results,
                    total_count
                });
            }).sort({ [sort]: order }).skip(limit * page).limit(limit);
        });
    }

    private static async deleteImage(req: Request, res: Response, next: NextFunction) {
        res.json("ne");
    }
}