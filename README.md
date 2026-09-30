# Alumni Portal - Web Engineering Lab

A web-based Alumni Portal developed for the Web Engineering Lab.  
The system allows alumni to create accounts, manage their profiles, browse job opportunities, and apply for jobs.

## Technologies Used

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- EJS
- MySQL
- Multer
- bcrypt
- Express Session

## Requirements

- Node.js
- MySQL / MySQL Workbench
- Internet connection for the configured Aiven MySQL database

## Features

- Alumni Registration
- Secure Password Hashing
- Alumni Login
- Session-based Authentication
- Alumni Dashboard
- View Profile Information
- Edit Profile
- Profile Image Upload
- Browse Job Opportunities
- View Job Details
- Apply for Jobs
- My Applications
- Application Status
- Logout

## Project Structure

```text
Alumni Registration/
│
├── app.js
├── database.sql
├── package.json
├── package-lock.json
│
├── views/
│   ├── login.ejs
│   ├── index.ejs
│   ├── success.ejs
│   ├── dashboard.ejs
│   ├── edit-profile.ejs
│   ├── jobs.ejs
│   ├── job-details.ejs
│   └── applications.ejs
│
└── public/
    └── uploads/