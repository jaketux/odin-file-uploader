const prisma = require("../prisma.ts");

const { Router } = require("express");

const usersController = require("../controller/userController");

const usersRouter = Router();

const { body, validationResult } = require("express-validator");

const passport = require("passport");

//validationrules here

const validationRulesSignUp = [
  body("username")
    .trim()
    .escape()
    .toLowerCase()
    .notEmpty()
    .withMessage("Username is a required field")
    .matches(/^[a-zA-Z0-9]+$/)
    .withMessage("Username can only contain letters and numbers.")
    .isLength({ min: 4, max: 14 })
    .withMessage("Username can only be between 4 and 14 characters long."),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is a required field.")
    .matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/)
    .withMessage("Please enter a valid email address."),

  body("firstname")
    .trim()
    .notEmpty()
    .withMessage("First name is a required field")
    .matches(/^[a-zA-Z]+$/)
    .withMessage("First name can only contain letters.")
    .isLength({ min: 1, max: 50 })
    .withMessage("First name must be less than 50 characters long."),

  body("lastname")
    .trim()
    .notEmpty()
    .withMessage("Last name is a required field")
    .matches(/^[a-zA-Z]+$/)
    .withMessage("Last name can only contain letters.")
    .isLength({ min: 1, max: 50 })
    .withMessage("Last name must be less than 50 characters long."),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long.")
    .matches(/(?=.*[a-z])/)
    .withMessage("Password must contain at least one lowercase letter.")
    .matches(/(?=.*[A-Z])/)
    .withMessage("Password must contain at least one uppercase letter.")
    .matches(/(?=.*\d)/)
    .withMessage("Password must contain at least one number.")
    .matches(/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
    .withMessage("Password must contain at least one special character."),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error(
        "Passwords do not match. Please enter matching passwords to continue."
      );
    }
    return true;
  }),
];
//routes here

usersRouter.get("/", usersController.homePageGet);

usersRouter.get("/login", usersController.logInGet);

usersRouter.post("/login", (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required. " });
  }
  passport.authenticate("local", (error, user, info) => {
    if (error) {
      return next(error);
    }
    if (!user) {
      return res.render("login", {
        title: "Log in",
        text: "Enter your username and password below to log in to the Clubhouse. ",
        errors: [{ msg: "Invalid login details, please try again." }],
      });
    }
    req.logIn(user, (error) => {
      if (error) {
        return next(error);
      }
      return res.redirect("/");
    });
  })(req, res, next);
});

usersRouter.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

const multer = require("multer");
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
});

usersRouter.get("/sign-up", usersController.signUpGet);
usersRouter.post("/sign-up", validationRulesSignUp, usersController.signUpPost);

usersRouter.get("/folders", usersController.foldersGet);

usersRouter.get("/:id/view-folder", usersController.folderGet);

usersRouter.get("/:id/rename-folder/", usersController.renameFolderGet);
usersRouter.post("/:id/rename-folder/", usersController.renameFolderPost);

usersRouter.post("/:id/delete-folder/", usersController.deleteFolderPost);

usersRouter.get("/create-folder", usersController.createFolderGet);
usersRouter.post("/create-folder", usersController.createFolderPost);

usersRouter.post(
  "/:id/upload-file",
  upload.single("file"),
  usersController.uploadFilePost
);

module.exports = usersRouter;
