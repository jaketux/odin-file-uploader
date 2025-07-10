const bcrypt = require("bcryptjs");

const { validationResult } = require("express-validator");

const prisma = require("../prisma.ts");

const { createClient } = require("@supabase/supabase-js");

async function homePageGet(req, res) {
  if (req.user) {
    const user = await prisma.user.findFirst({
      where: { email: req.user.email },
      include: { folders: true },
    });

    const folders = user.folders;
    console.log(req.user);

    res.render("index", {
      title: "Storage Wars",
      text: "Welcome to Storage Wars, your web storage solution.",
      user: req.user,
      folders: folders,
    });
  } else {
    res.render("index", {
      title: "Storage Wars",
      text: "Welcome to Storage Wars, your web storage solution.",
    });
  }
}

async function logInGet(req, res) {
  res.render("login", {
    title: "Log in",
    text: "Enter your username and password below to login.",
  });
}

async function foldersGet(req, res) {
  if (req.user) {
    const user = await prisma.user.findFirst({
      where: { email: req.user.email },
      include: { folders: true },
    });

    const folders = user.folders;

    res.render("folders", {
      title: "Your Folders",
      text:
        folders.length > 0
          ? "Select a folder below to explore the files within."
          : "You do not have any folders to display.",
      user: req.user,
      folders: folders,
    });
  } else {
    res.render("index", {
      title: "Storage Wars",
      text: "Welcome to Storage Wars, your web storage solution.",
    });
  }
}

async function folderGet(req, res) {
  if (req.user) {
    const id = parseInt(req.params.id);
    console.log(req.params.id);
    const folder = await prisma.folder.findFirst({
      where: { id: id },
      include: { files: true },
    });

    if (!folder) {
      return res.status(404).send("Folder not found. ");
    }

    if (folder.userId !== req.user.id) {
      return res.status(403).send("Access denied. ");
    }

    console.log(folder);

    res.render("folder", {
      title: folder.name,
      folder: folder,
    });
  }
}

async function renameFolderGet(req, res) {
  if (req.user) {
    const id = parseInt(req.params.id);
    const folder = await prisma.folder.findFirst({
      where: { id: id },
    });

    if (folder.userId !== req.user.id) {
      return res.status(403).send("Access denied");
    }

    res.render("update", {
      title: `Rename ${folder.name}`,
      text: "Enter the new name for your folder below:",
      folder: folder,
      renameFolder: true,
    });
  }
}

async function renameFolderPost(req, res) {
  if (req.user) {
    const id = parseInt(req.params.id);
    const newname = req.body.newname;
    const folder = await prisma.folder.update({
      where: { id: id },
      data: {
        name: newname,
      },
    });

    if (folder.userId !== req.user.id) {
      return res.status(403).send("Access denied");
    }
    console.log(folder);
    res.redirect("/");
  }
}

async function createFolderGet(req, res) {
  if (req.user) {
    res.render("update", {
      title: "New Folder",
      text: "Enter the name for your new folder below:",
      createFolder: true,
    });
  }
}

async function createFolderPost(req, res) {
  if (req.user) {
    const id = req.user.id;
    const folder = await prisma.folder.create({
      data: { name: req.body.name, userId: id },
    });

    res.redirect("/");
  }
}

async function deleteFolderPost(req, res) {
  if (req.user) {
    const id = parseInt(req.params.id);
    const folder = await prisma.folder.delete({
      where: { id: id },
    });
  }

  res.redirect("/");
}

async function signUpGet(req, res) {
  res.render("sign-up", {
    title: "Sign up to Storage Wars",
    text: "Enter the form below to sign up and start using Storage Wars.",
  });
}

async function signUpPost(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.render("sign-up", {
      title: "Sign up",
      text: "Complete the form below to sign up to the clubhouse.",
      errors: errors.array(),
      formData: req.body,
    });
  }

  const username = req.body.username;
  const email = req.body.email;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const password = req.body.password;
  const hashedPassword = await bcrypt.hash(password, 10);

  console.log(hashedPassword);
  try {
    const user = await prisma.user.create({
      data: {
        email,
        name: username,
        firstname,
        lastname,
        password: {
          create: {
            hash: hashedPassword,
          },
        },
      },
    });
    res.redirect("/");
  } catch (error) {
    console.error(error);
  }
}

async function uploadFilePost(req, res) {
  if (req.user) {
    const supabaseUrl = "https://gjnphxhoeuutaypojtey.supabase.co";
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const usersSupabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${req.user.token}`,
        },
      },
    });

    const file = req.file.buffer;
    const id = req.user.id;
    const folder = parseInt(req.params.id);
    const mimeType = req.file.mimetype;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    const filePath = `users/${id}/${folder}/${fileName}`;

    try {
      const { data, error } = await usersSupabase.storage
        .from("filestorage")
        .upload(filePath, file, {
          contentType: mimeType,
        });

      if (error) {
        console.error("Upload error:", error);
        throw error;
      }

      console.log("Upload successful: ", data);

      const { data: urlData } = await usersSupabase.storage
        .from("filestorage")
        .getPublicUrl(filePath);

      const prismaFilePath = await prisma.file.create({
        data: {
          filename: fileName,
          folderId: folder,
          fileLink: urlData.publicUrl,
          fileSize: fileSize,
        },
      });

      console.log(prismaFilePath);
      res.redirect(`/${folder}/view-folder`);
    } catch (error) {
      const folder = parseInt(req.params.id);

      const selectedFolder = await prisma.folder.findFirst({
        where: { id: folder },
        include: { files: true },
      });
      res.render("folder", {
        title: selectedFolder.name,
        folder: selectedFolder,
        errors: [error],
      });
      console.log(error);
      return;
    }
  } else {
    res.status(401).json({ error: "User not authenticated." });
  }
  //get file link back from supabase when uploaded and store this file in the prisma database
}

module.exports = {
  homePageGet,
  logInGet,
  foldersGet,
  folderGet,
  renameFolderGet,
  renameFolderPost,
  createFolderGet,
  createFolderPost,
  deleteFolderPost,
  signUpGet,
  signUpPost,
  uploadFilePost,
};
