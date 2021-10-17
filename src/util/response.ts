/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Response } from "express";
import { Result, ValidationError } from "express-validator";

export interface ResponseFormat {
	success: boolean;
	errors: { msg: string }[] | Result<ValidationError>;

	content: unknown;
}

export function sendResponse(res: Response, answer: ResponseFormat) {
	res.json(answer);
}

export function sendResponseSuccess(res: Response, content?: unknown) {
	sendResponse(res, { success: true, errors: undefined, content });
}

export function sendResponseErrorMsg(res: Response, ...errors: string[]) {
	sendResponseError(res, errors.map(error => { return { msg: error }; }));
}

export function sendResponseError(res: Response, errors: { msg: string }[] | Result<ValidationError>) {
	sendResponse(res, { success: false, errors: errors instanceof Result ? errors.array() : errors, content: undefined });
}