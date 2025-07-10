const prisma = require("./prisma.ts");

const express = require("express");

const app = express();

const usersRouter = require("./routes/usersRouter");

const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const { PrismaSessionStore } = require("@quixo3/prisma-session-store");

const bcrypt = require("bcryptjs");

require("dotenv").config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set("view engine", "ejs");
app.use(
  session({
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    secret: "dogs",
    resave: false,
    saveUninitialized: true,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" },
    async (email, password, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { email },
          include: { password: true },
        });

        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }

        const match = await bcrypt.compare(password, user.password.hash);

        if (!match) {
          return done(null, false, { message: "Incorrect password" });
        }

        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstname: true },
    });

    done(null, user);
  } catch (error) {
    done(error);
  }
});

app.use(passport.session());

app.use("/", usersRouter);

app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
  console.log(`Express app listening on port ${process.env.PORT || 3000}`);
});
