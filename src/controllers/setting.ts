/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Response, Request, NextFunction, Application } from "express";
import { check, validationResult } from "express-validator";
import { Types } from "mongoose";
import { Content } from "../models/Content";
import { Setting } from "../models/Setting";
import * as passportConfig from "../config/passport";

export class SettingRoute {

	static init(app: Application) {
		app.post("/api/setting/content", SettingRoute.postSettingEvent);
		app.post("/api/setting/content/update", passportConfig.isAuthenticated, SettingRoute.postSettingEventUpdate);
		app.post("/api/setting/content/delete", passportConfig.isAuthenticated, SettingRoute.postSettingEventDelete);
	}

	private static async postSettingEvent(req: Request, res: Response, next: NextFunction) {
		Setting.findOne({ "_setting": "event" }, (error, setting) => {
			if (error) {
				return next(error);
			}

			if (!setting) {
				res.json({});
				return;
			}

			res.json(setting);
		});
	}

	private static async postSettingEventUpdate(req: Request, res: Response, next: NextFunction) {
		if (req.body.eventId) {
			await check("eventId", "Setting id is requierd").custom(value => Types.ObjectId.isValid(value)).run(req);

			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				res.json({
					success: false,
					errors: errors.array()
				});
				return;
			}

			Content.findById(req.body.eventId, (error, event) => {
				if (error) {
					return next(error);
				}

				if (!event) {
					res.json({
						success: false,
						errors: [{
							msg: "EventId was not found"
						}]
					});
					return;
				}

				Setting.findOne({ "_setting": "event" }, (error2, setting) => {
					if (error2) {
						return next(error2);
					}

					if (!setting) {
						setting = new Setting({
							_setting: "event",
							settings: {
								currentEventId: event.id,
								currentEventName: req.body.currentEventName || event.name,
								currentEventImage: req.body.currentEventImage || event.image,
								currentEventImageItem: req.body.currentEventImageItem || event.image,
								currentEventImageLocation: req.body.currentEventImageLocation || event.image,
								currentEventImageArchivement: req.body.currentEventImageArchivement || event.image
							}
						});
					} else {
						setting.settings.set("currentEventId", event.id);
						setting.settings.set("currentEventName", req.body.currentEventName || event.name);
						setting.settings.set("currentEventImage", req.body.currentEventImage || event.image);
						setting.settings.set("currentEventImageItem", req.body.currentEventImageItem || event.image);
						setting.settings.set("currentEventImageLocation", req.body.currentEventImageLocation || event.image);
						setting.settings.set("currentEventImageArchivement", req.body.currentEventImageArchivement || event.image);
					}

					setting.save((error3, saved) => {
						if (error3) {
							return next(error3);
						}

						res.json({ success: true, setting: saved });
					});
				});
			});
		} else {
			await check("id", "Setting id is requierd").custom(value => Types.ObjectId.isValid(value)).run(req);

			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				res.json({
					success: false,
					errors: errors.array()
				});
				return;
			}

			Setting.findById(req.body.id, (error, setting) => {
				if (error) {
					return next(error);
				}

				if (!setting) {
					res.json({
						success: false,
						errors: [{
							msg: "Setting id not found"
						}]
					});
					return;
				}

				setting.settings.set("currentEventImage", req.body.currentEventImage || setting.settings.get("currentEventImage"));
				setting.settings.set("currentEventImageItem", req.body.currentEventImageItem || setting.settings.get("currentEventImageItem"));
				setting.settings.set("currentEventImageLocation", req.body.currentEventImageLocation || setting.settings.get("currentEventImageLocation"));
				setting.settings.set("currentEventImageArchivement", req.body.currentEventImageArchivemen || setting.settings.get("currentEventImageLocation"));

				setting.save((error3, saved) => {
					if (error3) {
						return next(error3);
					}

					res.json({ success: true, setting: saved });
				});
			});
		}
	}

	private static async postSettingEventDelete(req: Request, res: Response, next: NextFunction) {
		await check("id", "Setting id is requierd").custom(value => Types.ObjectId.isValid(value)).run(req);
		//await check("value", "Value is requierd").isArray().run(req);

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.json({
				success: false,
				errors: errors.array()
			});
			return;
		}

		Setting.findById(req.body.id, (error, setting) => {
			if (error) {
				return next(error);
			}

			if (!setting) {
				res.json({
					success: false,
					errors: [{
						msg: "Setting id not found"
					}]
				});
				return;
			}

			res.json({ success: true });
			setting.deleteOne();
		});
	}
}