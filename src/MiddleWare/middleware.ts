import { Request, Response, NextFunction } from "express";

// Read password from env
const API_PASSWORD = process.env.API_PASSWORD;
if(!API_PASSWORD){
  throw new Error("API_PASSWORD is not set");
}

export const checkPassword = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const providedPassword =
    req.headers["x-api-key"] || req.body.password || req.query.password;

  if (providedPassword !== API_PASSWORD) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid API password",
    });
  }

  next();
};
