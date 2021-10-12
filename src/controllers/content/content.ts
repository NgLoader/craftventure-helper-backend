/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Application, NextFunction, Request, Response } from "express";
import { check, validationResult } from "express-validator";
import { Types } from "mongoose";
import { sendResponseError, sendResponseErrorMsg, sendResponseSuccess } from "../../util/response";
import { Content, ContentCategory, ContentDocument } from "../../models/Content";
import * as passportConfig from "../../config/passport";
import { ContentCategoryRoute } from "./content.category";

export class ContentRoute {

	static init(app: Application) {
		app.post("/api/content", ContentRoute.postContents);
		app.post("/api/content/create", passportConfig.isAuthenticated, ContentRoute.postCreate);
		app.post("/api/content/update", passportConfig.isAuthenticated, ContentRoute.postUpdate);
		app.post("/api/content/delete", passportConfig.isAuthenticated, ContentRoute.postDelete);

		ContentCategoryRoute.init(app);
	}

	/**
	 * List of all items.
	 * @route POST /api/content
	 */
	private static async postContents(req: Request, res: Response, next: NextFunction) {
		if (req.body._id) {
			await check("_id", "Category id was not found.").custom(value => Types.ObjectId.isValid(value)).run(req);
		}

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			sendResponseError(res, errors);
			return;
		}

		Content.find({ "_categoryId": req.body._id }, (error, result) => {
			if (error) {
				return next(error);
			}

			const content: ContentDocument[] = [];
			result.forEach((element, index) => {
				if (element.enabled || req.user) {
					content.push(result[index]);
				}
			});
			sendResponseSuccess(res, content);
		});
	}

	/**
	 * Create a new item.
	 * @route POST /api/content/create
	 */
	private static async postCreate(req: Request, res: Response, next: NextFunction) {
		if (req.body._parentId) {
			await check("_categoryId", "CategoryId was not valied.").custom(value => Types.ObjectId.isValid(value)).run(req);
		}
		await check("name", "Name was not found.").isLength({ min: 1, max: 16 }).run(req);
		await check("image", "Image was not found.").isURL().run(req);
		await check("keywords", "Keywords was not found.").isArray().run(req);
		await check("enabled", "Enabled value was not found.").isBoolean().run(req);

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			sendResponseError(res, errors);
			return;
		}

		if (req.body._categoryId) {
			const parent = await ContentCategory.findById(req.body._categoryId).exec()
				.catch(error => {
					return next(error);
				});

			if (!parent) {
				sendResponseErrorMsg(res, "CategoryId was not found.");
				return;
			}
		}

		const item = new Content({
			_categoryId: req.body._categoryId,
			name: req.body.name,
			image: req.body.image,
			keywords: req.body.keywords,
			enabled: req.body.enabled
		});

		if (item._categoryId) {
			ContentCategory.findById(item._categoryId, (error, result) => {
				if (error) {
					return next(error);
				}

				if (!result) {
					sendResponseErrorMsg(res, "CategoryId was not found.");
					return;
				}

				item.save((error2, result2) => {
					if (error2) {
						return next(error2);
					}

					sendResponseSuccess(res, result2);
				});
			});
		} else {
			item.save((error2, result2) => {
				if (error2) {
					return next(error2);
				}

				sendResponseSuccess(res, result2);
			});
		}
	}

	/**
	 * Update a item.
	 * @route POST /api/content/update
	 */
	private static async postUpdate(req: Request, res: Response, next: NextFunction) {
		await check("_id", "id was not valied.").custom(value => Types.ObjectId.isValid(value)).run(req);

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			sendResponseError(res, errors);
			return;
		}

		Content.findById(req.body._id, async (error, result) => {
			if (error) {
				return next(error);
			}

			if (!result) {
				sendResponseErrorMsg(res, "Id was not found.");
				return;
			}

			result.name = req.body.name || result.name;
			result.image = req.body.image || result.image;
			result.keywords = req.body.keywords || result.keywords;
			result.checklist = req.body.checklist || result.checklist;
			result.description = req.body.description || result.description;
			result.video = req.body.video || result.video;
			result.enabled = req.body.enabled != undefined ? req.body.enabled : result.enabled;
			result.save((error2, result2) => {
				if (error2) {
					return next(error2);
				}

				if (!result2) {
					sendResponseErrorMsg(res, "Error by saveing update.");
					return;
				}

				sendResponseSuccess(res, result2);
			});
		});
	}

	/**
	 * Delete a item.
	 * @route POST /api/content/delete
	 */
	private static async postDelete(req: Request, res: Response, next: NextFunction) {
		await check("_id", "id was not valied.").custom(value => Types.ObjectId.isValid(value)).run(req);

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			sendResponseError(res, errors);
			return;
		}

		Content.findById(req.body._id, async (error, result) => {
			if (error) {
				return next(error);
			}

			if (!result) {
				sendResponseErrorMsg(res, "Id was not found.");
				return;
			}

			sendResponseSuccess(res, { result });
			result.deleteOne();
		});
	}
}