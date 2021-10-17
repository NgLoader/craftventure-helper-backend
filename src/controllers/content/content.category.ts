/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Application, NextFunction, Request, Response } from "express";
import { check, validationResult } from "express-validator";
import { ObjectId, Types } from "mongoose";
import { sendResponseError, sendResponseErrorMsg, sendResponseSuccess } from "../../util/response";
import { Content, ContentCategory, ContentCategoryDocument } from "../../models/Content";
import * as passportConfig from "../../config/passport";
import { UserDocument } from "../../models/User";
import { UserRole } from "../../models/User";

export class ContentCategoryRoute {

	static init(app: Application) {
		app.post("/content/path", ContentCategoryRoute.postPath);
		app.post("/content/category", ContentCategoryRoute.postCategorys);
		app.post("/content/category/create", passportConfig.isAuthenticated, ContentCategoryRoute.postCreate);
		app.post("/content/category/update", passportConfig.isAuthenticated, ContentCategoryRoute.postUpdate);
		app.post("/content/category/delete", passportConfig.isAuthenticated, ContentCategoryRoute.postDelete);
	}

	/**
* Convert a path to ids.
* @route POST /api/content/path
*/
	private static async postPath(req: Request, res: Response, next: NextFunction) {
		await check("path", "Path was not found.").isArray().run(req);

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			sendResponseError(res, errors);
			return;
		}

		const path: string[] = req.body.path;
		if (path.length == 0) {
			sendResponseErrorMsg(res, "Path content is empty.");
			return;
		}

		const ids: ObjectId[] = [];
		let parentId: ObjectId = undefined;

		for (let pathName of path) {
			pathName = decodeURI(pathName);
			const result = await ContentCategory.find({ "_parentId": parentId, "name": pathName }).exec()
				.catch(error => {
					return next(error);
				});

			if (!result || result.length == 0) {
				const element = await Content.find({ "_categoryId": parentId, "name": pathName }).exec()
				.catch(error => {
					return next(error);
				});

				if (element && element.length != 0) {
					if (element[0].enabled || req.user) {
						sendResponseSuccess(res, { ids, element: element[0] });
						return;
					}
				}

				sendResponseErrorMsg(res, "No category was found.");
				return;
			}

			if (!result[0].enabled && !req.user) {
				sendResponseErrorMsg(res, "No category was found.");
				return;
			}

			parentId = result[0]._id;
			ids.push(parentId);
		}

		sendResponseSuccess(res, { ids });
	}

	/**
	 * List of all categorys.
	 * @route POST /api/content/category
	 */
	private static async postCategorys(req: Request, res: Response, next: NextFunction) {
		if (req.body._id) {
			await check("_id", "Category id was not found.").custom(value => Types.ObjectId.isValid(value)).run(req);
		}

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			sendResponseError(res, errors);
			return;
		}

		ContentCategory.find({ "_parentId": req.body._id }, (error, result) => {
			if (error) {
				return next(error);
			}

			const content: ContentCategoryDocument[] = [];
			result.forEach((element, index) => {
				if (element.enabled || req.user) {
					content.push(result[index]);
				}
			});
			sendResponseSuccess(res, content);
		});
	}

	/**
	 * Create a new category.
	 * @route POST /api/content/category/create
	 */
	private static async postCreate(req: Request, res: Response, next: NextFunction) {
		if (req.body._parentId) {
			await check("_parentId", "ParentId was not valied.").custom(value => Types.ObjectId.isValid(value)).run(req);
		}
		await check("name", "Name was not found.").isLength({ min: 1, max: 32 }).run(req);
		await check("image", "Image was not found.").isURL().run(req);
		await check("keywords", "Keywords was not found.").isArray().run(req);
		await check("enabled", "Enabled value was not found.").isBoolean().run(req);

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			sendResponseError(res, errors);
			return;
		}

        const userDoc = req.user as UserDocument;
        if (userDoc.role != UserRole.ADMIN && userDoc.role != UserRole.EDITOR) {
            sendResponseErrorMsg(res, "You don't have permission to performe this command");
            return;
        }

		if (req.body._parentId) {
			const parent = await ContentCategory.findById(req.body._parentId).exec()
				.catch(error => {
					return next(error);
				});

			if (!parent) {
				sendResponseErrorMsg(res, "ParentId was not found.");
				return;
			}
		}

		const category = new ContentCategory({
			_parentId: req.body._parentId,
			name: req.body.name,
			image: req.body.image,
			keywords: req.body.keywords,
			enabled: req.body.enabled
		});

		ContentCategory.findOne({ "_parentId": category._parentId, "name": category.name }, (error, result) => {
			if (error) {
				return next(error);
			}

			if (result) {
				sendResponseErrorMsg(res, "Name with parentId already in use.");
				return;
			}

			category.save((error2, result2) => {
				if (error2) {
					return next(error2);
				}

				sendResponseSuccess(res, result2);
			});
		});
	}

	/**
	 * Update a category.
	 * @route POST /api/content/category/update
	 */
	private static async postUpdate(req: Request, res: Response, next: NextFunction) {
		await check("_id", "id was not valied.").custom(value => Types.ObjectId.isValid(value)).run(req);

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			sendResponseError(res, errors);
			return;
		}

        const userDoc = req.user as UserDocument;
        if (userDoc.role != UserRole.ADMIN && userDoc.role != UserRole.EDITOR) {
            sendResponseErrorMsg(res, "You don't have permission to performe this command");
            return;
        }

		ContentCategory.findById(req.body._id, async (error, result) => {
			if (error) {
				return next(error);
			}

			if (!result) {
				sendResponseErrorMsg(res, "Id was not found.");
				return;
			}

			if (req.body.name) {
				const found = await ContentCategory.findOne({ "_id": result._id, "name": req.body.name }).exec()
					.catch(error2 => {
						return next(error2);
					});

				if (found && found.id != result._id) {
					sendResponseErrorMsg(res, "Name already in use");
					return;
				}
			}

			result.name = req.body.name || result.name;
			result.image = req.body.image || result.image;
			result.keywords = req.body.keywords || result.keywords;
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
	 * Delete a category and his child's.
	 * @route POST /api/content/category/delete
	 */
	private static async postDelete(req: Request, res: Response, next: NextFunction) {
		await check("_id", "id was not valied.").custom(value => Types.ObjectId.isValid(value)).run(req);

		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			sendResponseError(res, errors);
			return;
		}

        const userDoc = req.user as UserDocument;
        if (userDoc.role != UserRole.ADMIN && userDoc.role != UserRole.EDITOR) {
            sendResponseErrorMsg(res, "You don't have permission to performe this command");
            return;
        }

		ContentCategory.findById(req.body._id, async (error, result) => {
			if (error) {
				return next(error);
			}

			if (!result) {
				sendResponseErrorMsg(res, "Id was not found.");
				return;
			}

			// Delete item's from category
			Content.find({ "_categoryId": result._id }, (error2, results2) => {
				if (error2) {
					return next(error2);
				}

				if (results2) {
					for (const result2 of results2) {
						if (result2) {
							result2.deleteOne();
						}
					}
				}
			});

			// Delete child item's from category
			const childIds: ObjectId[] = [result._id];
			while (childIds.length != 0) {
				const childId = childIds.pop();
				const results = await ContentCategory.find({ "_parentId": childId }).exec()
					.catch(error2 => {
						return next(error2);
					});

				if (results) {
					for (const child of results) {
						if (child) {
							childIds.push(child._id);
							Content.find({ "_categoryId": child._id }, (error2, results2) => {
								if (error2) {
									return next(error2);
								}

								if (results2) {
									for (const result2 of results2) {
										if (result2) {
											result2.deleteOne();
										}
									}
								}
							});
							child.deleteOne();
						}
					}
				}
			}

			sendResponseSuccess(res, { result });
			result.deleteOne();
		});
	}
}