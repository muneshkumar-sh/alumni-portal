require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = 3000;
const bcrypt = require("bcrypt");
const session = require("express-session");

// ================= DATABASE CONNECTION =================

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: {
        ca: fs.readFileSync("ca.pem")
    }
});

db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        return;
    }

    console.log("Connected to MySQL database.");
});

// ================= MIDDLEWARE =================

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false
    })
);

app.set("view engine", "ejs");

// ================= FILE UPLOAD =================

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, "public/uploads");
    },

    filename: (req, file, cb) => {

        const uniqueName =
            Date.now() + "-" + file.originalname;

        cb(null, uniqueName);
    }

});

const upload = multer({
    storage: storage,

    limits: {
        fileSize: 2 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/gif"
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG and GIF images are allowed."));
        }
    }
});


// ================= HOME PAGE =================

app.get("/", (req, res) => {

    res.render("login");

});


// ================= REGISTRATION PAGE =================

app.get("/register", (req, res) => {

    res.render("index");

});


// ================= LOGIN =================

app.post("/login", (req, res) => {

    const { email, password } = req.body;


    const sql = `
        SELECT *
        FROM alumni
        WHERE email = ?
    `;


    db.query(sql, [email], async (err, results) => {

        if (err) {

            console.error("Login error:", err);

            return res.status(500).send(
                "Login failed."
            );
        }


        // User not found

        if (results.length === 0) {

            return res.status(401).send(
                "Invalid email or password."
            );
        }


        const user = results[0];


        // Compare password with bcrypt hash

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).send(
                "Invalid email or password."
            );
        }


        // Create login session

        req.session.userId = user.id;


        console.log(
            "User logged in:",
            user.email
        );


        res.redirect("/dashboard");

    });

});

// ==================== Dashboard ======================

app.get("/dashboard", (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/");
    }

    const userSql = `SELECT * FROM alumni WHERE id = ?`;

    db.query(userSql, [req.session.userId], (err, userResults) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error.");
        }

        if (userResults.length === 0) {
            return res.redirect("/");
        }

        const user = userResults[0];

        const applicationSql = `
            SELECT COUNT(*) AS totalApplications
            FROM applications
            WHERE alumni_id = ?
        `;

        db.query(
            applicationSql,
            [req.session.userId],
            (err, applicationResults) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send("Database error.");
                }

                const totalApplications =
                    applicationResults[0].totalApplications;

                res.render("dashboard", {
                    user: user,
                    totalApplications: totalApplications
                });
            }
        );
    });
});

// ================= EDIT PROFILE PAGE =================

app.get("/edit-profile", (req, res) => {

    // Check login
    if (!req.session.userId) {
        return res.redirect("/");
    }

    const sql = `
        SELECT *
        FROM alumni
        WHERE id = ?
    `;

    db.query(
        sql,
        [req.session.userId],
        (err, results) => {

            if (err) {

                console.error(
                    "Edit profile error:",
                    err
                );

                return res.status(500).send(
                    "Unable to load profile."
                );
            }

            if (results.length === 0) {

                return res.redirect("/");
            }

            const user = results[0];

            res.render("edit-profile", {
                user: user
            });

        }
    );

});

// ================= LOGOUT =================

app.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {

            console.error(
                "Logout error:",
                err
            );

            return res.status(500).send(
                "Unable to logout."
            );
        }

        res.redirect("/");

    });

});

// ================= UPDATE PROFILE =================

app.post(
    "/edit-profile",
    upload.single("profile_image"),
    (req, res) => {

        // Check login
        if (!req.session.userId) {
            return res.redirect("/");
        }


        const {
            full_name,
            phone,
            gender,
            department,
            degree_program,
            graduation_year,
            cgpa,
            employment_status,
            company,
            job_title,
            skills,
            linkedin,
            bio
        } = req.body;


        // Keep old image if no new image is uploaded
        if (!req.file) {

            const sql = `
                UPDATE alumni
                SET
                    full_name = ?,
                    phone = ?,
                    gender = ?,
                    department = ?,
                    degree_program = ?,
                    graduation_year = ?,
                    cgpa = ?,
                    employment_status = ?,
                    company = ?,
                    job_title = ?,
                    skills = ?,
                    linkedin = ?,
                    bio = ?
                WHERE id = ?
            `;


            const values = [
                full_name,
                phone,
                gender,
                department,
                degree_program,
                graduation_year || null,
                cgpa || null,
                employment_status,
                company,
                job_title,
                skills,
                linkedin,
                bio,
                req.session.userId
            ];


            db.query(
                sql,
                values,
                (err) => {

                    if (err) {

                        console.error(
                            "Profile update error:",
                            err
                        );

                        return res.status(500).send(
                            "Profile update failed."
                        );
                    }


                    res.redirect("/dashboard");

                }
            );

        } else {

            // New profile image uploaded

            const sql = `
                UPDATE alumni
                SET
                    full_name = ?,
                    phone = ?,
                    gender = ?,
                    department = ?,
                    degree_program = ?,
                    graduation_year = ?,
                    cgpa = ?,
                    employment_status = ?,
                    company = ?,
                    job_title = ?,
                    skills = ?,
                    linkedin = ?,
                    bio = ?,
                    profile_image = ?
                WHERE id = ?
            `;


            const values = [
                full_name,
                phone,
                gender,
                department,
                degree_program,
                graduation_year || null,
                cgpa || null,
                employment_status,
                company,
                job_title,
                skills,
                linkedin,
                bio,
                "/uploads/" + req.file.filename,
                req.session.userId
            ];


            db.query(
                sql,
                values,
                (err) => {

                    if (err) {

                        console.error(
                            "Profile update error:",
                            err
                        );

                        return res.status(500).send(
                            "Profile update failed."
                        );
                    }


                    res.redirect("/dashboard");

                }
            );

        }

    }
);

// ================= REGISTRATION =================

app.post(
    "/register",
    upload.single("profile_image"),
    (req, res) => {

        const {
            full_name,
            email,
            password,
            phone,
            gender,
            department,
            graduation_year,
            cgpa,
            degree_program,
            employment_status,
            company,
            job_title,
            linkedin,
            bio,
            terms_accepted
        } = req.body;


        // Get selected skills
        let skills = req.body.skills || "";

        if (Array.isArray(skills)) {
            skills = skills.join(", ");
        }


        // Get uploaded image
        const profileImage = req.file
            ? "/uploads/" + req.file.filename
            : null;


        // Check terms
        const termsAccepted =
            terms_accepted ? 1 : 0;


        // ================= INSERT DATA =================

        const sql = `
            INSERT INTO alumni
            (
                full_name,
                email,
                password,
                phone,
                gender,
                department,
                graduation_year,
                cgpa,
                degree_program,
                employment_status,
                company,
                job_title,
                skills,
                linkedin,
                bio,
                profile_image,
                terms_accepted
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;


        bcrypt.hash(password, 10, (hashError, hashedPassword) => {

            if (hashError) {
                console.error("Password hashing error:", hashError);
                return res.status(500).send("Registration failed.");
            }

            const values = [
                full_name,
                email,
                hashedPassword,
                phone,
                gender,
                department,
                graduation_year || null,
                cgpa || null,
                degree_program,
                employment_status,
                company,
                job_title,
                skills,
                linkedin,
                bio,
                profileImage,
                termsAccepted
            ];

            db.query(sql, values, (err, result) => {

                if (err) {

                    console.error(
                        "Registration error:",
                        err
                    );

                    // Duplicate email
                    if (err.code === "ER_DUP_ENTRY") {

                        return res.status(400).send(
                            "This email is already registered. Please login."
                        );
                    }

                    return res.status(500).send(
                        "Registration failed."
                    );
                }

                console.log(
                    "New alumni registered. ID:",
                    result.insertId
                );

                res.render("success", {
                    id: result.insertId,
                    name: full_name,
                    email: email
                });

            });

        });

    }
);

// ================= JOB OPPORTUNITIES =================

app.get("/jobs", (req, res) => {

    // User must be logged in
    if (!req.session.userId) {
        return res.redirect("/");
    }

    const sql = `
        SELECT *
        FROM jobs
        ORDER BY created_at DESC
    `;

    db.query(sql, (err, results) => {

        if (err) {

            console.error(
                "Jobs loading error:",
                err
            );

            return res.status(500).send(
                "Unable to load jobs."
            );
        }

        res.render("jobs", {
            jobs: results
        });

    });

});

// ================= JOB DETAILS =================

app.get("/jobs/:id", (req, res) => {

    // User must be logged in
    if (!req.session.userId) {
        return res.redirect("/");
    }

    const jobId = req.params.id;

    const sql = `
        SELECT *
        FROM jobs
        WHERE id = ?
    `;

    db.query(
        sql,
        [jobId],
        (err, results) => {

            if (err) {

                console.error(
                    "Job details error:",
                    err
                );

                return res.status(500).send(
                    "Unable to load job."
                );
            }


            if (results.length === 0) {

                return res.status(404).send(
                    "Job not found."
                );
            }


            const job = results[0];


            res.render("job-details", {
                job: job
            });

        }
    );

});

// Apply for a job
app.post("/jobs/:id/apply", (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/");
    }

    const jobId = req.params.id;
    const alumniId = req.session.userId;

    // Check if job exists
    const checkJobSql = `SELECT * FROM jobs WHERE id = ?`;

    db.query(checkJobSql, [jobId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error.");
        }

        if (results.length === 0) {
            return res.status(404).send("Job not found.");
        }

        // Insert application
        const insertSql = `
            INSERT INTO applications (alumni_id, job_id)
            VALUES (?, ?)
        `;

        db.query(insertSql, [alumniId, jobId], (err) => {
            if (err) {
                // User already applied
                if (err.code === "ER_DUP_ENTRY") {
                    return res.send(`
                        <h2>You have already applied for this job.</h2>
                        <a href="/jobs">Back to Jobs</a>
                    `);
                }

                console.error(err);
                return res.status(500).send("Unable to apply for the job.");
            }

            res.redirect("/applications");
        });
    });
});

// My Applications
app.get("/applications", (req, res) => {
    if (!req.session.userId) {
        return res.redirect("/");
    }

    const sql = `
        SELECT 
            applications.*,
            jobs.title,
            jobs.company,
            jobs.location,
            jobs.job_type
        FROM applications
        JOIN jobs ON applications.job_id = jobs.id
        WHERE applications.alumni_id = ?
        ORDER BY applications.applied_at DESC
    `;

    db.query(sql, [req.session.userId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Database error.");
        }

        res.render("applications", {
            applications: results
        });
    });
});


// ================= SERVER =================

app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});