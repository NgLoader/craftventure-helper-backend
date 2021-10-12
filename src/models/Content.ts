import mongoose, { ObjectId, Schema } from "mongoose";

type SampleDocument = mongoose.Document & {
	_id: ObjectId;

	name: string;
	image: string;
	keywords: string[];
	enabled: boolean;
}

export type ContentDocument = SampleDocument & {
	_categoryId: ObjectId;
	checklist: string[];
	description: string;
	video: string;
}

export type ContentCategoryDocument = SampleDocument & {
	_parentId: ObjectId;
}

const ContentSchema = new mongoose.Schema({
	_categoryId: {
		type: Schema.Types.ObjectId,
		required: false
	},
	name: String,
	image: String,
	keywords: [String],
	enabled: Boolean,
	checklist: [String],
	description: String,
	video: String
});

const ContentCategorySchema = new mongoose.Schema({
	_parentId: {
		type: Schema.Types.ObjectId,
		required: false
	},

	name: String,
	image: String,
	keywords: [String],
	enabled: Boolean
});

export const Content = mongoose.model<ContentDocument>("content", ContentSchema);
export const ContentCategory = mongoose.model<ContentCategoryDocument>("content.categorys", ContentCategorySchema);