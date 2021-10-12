import mongoose, { ObjectId, Schema } from "mongoose";
//import _ from "lodash"; // _.assign({}, SettingSchema,

export type SettingDocument = mongoose.Document & {
	_id: ObjectId,
	_setting: string,

	settings: Map<string, string>;
}

const SettingSchema = new mongoose.Schema({
	_setting: String,

	settings: {
		type: Schema.Types.Map,
		of: String
	}
});

export const Setting = mongoose.model<SettingDocument>("setting", SettingSchema);