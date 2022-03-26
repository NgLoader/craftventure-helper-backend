/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";


export type ImageDocument = mongoose.Document & {
    length: number;
    chunkSize: number;
    size: number;
    uploadDate: Date;
    filename: string;
    md5: string;
    contentType: string;
};

const ImageSchema = new mongoose.Schema({
    length: Number,
    chunkSize: Number,
    size: Number,
    uploadDate: Date,
    filename: String,
    md5: String,
    contentType: String
});

export const Image = mongoose.model<ImageDocument>("images.files", ImageSchema);