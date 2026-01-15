import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from "./config/db.js";
import rateLimiter from "./middleware/rateLimiter.js";
import authRoutes from "./routes/authRoutes.js";
import studyRoutes from "./routes/studyRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
// app.use(rateLimiter);

app.use((req, res, next) => {
    console.log(`Req method is ${req.method} & Req URL is ${req.url}`);
    next();
})

app.use("/api/auth", authRoutes);
app.use("/api/study", studyRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// The "catchall" handler: for any request that doesn't match API routes,
// send back React's index.html file.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'), (err) => {
        if (err) {
            res.status(500).send(err);
        }
    });
});

connectDB().then(() => {
    app.listen(PORT, () =>{
    console.log("Server started on PORT:", PORT);
    })
})


//[6]
// import express from "express";
// import notesRoutes from "./routes/notesRoutes.js"
// import {connectDB} from "./config/db.js"
// import rateLimiter from "./middleware/rateLimiter.js"
// import dotenv from "dotenv";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5001;

// app.use(express.json()); //middleware that will parse JSON bodies
// app.use(rateLimiter)

// //simple middleware
// app.use((req, res, next) => {
//     console.log(`Req method is ${req.method} & Req URL is ${req.url}`);
//     next();
// })

// app.use("/api/notes", notesRoutes);

// // make sure to connect to db first before starting the program
// connectDB().then(() => {
//     app.listen(PORT, () =>{
//     console.log("Server started on PORT:", PORT);
//     })
// })



// [5] Added a simple middleware
// import express from "express";
// import notesRoutes from "./routes/notesRoutes.js"
// import {connectDB} from "./config/db.js"
// import dotenv from "dotenv";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5001;

// connectDB();

// app.use(express.json()); //middleware that will parse JSON bodies

// //simple middleware
// app.use((req, res, next) => {
//     console.log(`Req method is ${req.method} & Req URL is ${req.url}`);
//     next();
// })

// app.use("/api/notes", notesRoutes);

// app.listen(PORT, () =>{
//     console.log("Server started on PORT:", PORT);
// })


// [4] Use environment variables and importing dotenv
// import express from "express";
// import notesRoutes from "./routes/notesRoutes.js"
// import {connectDB} from "../config/db.js"
// import dotenv from "dotenv";

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5001;

// connectDB();

// app.use("/api/notes", notesRoutes);

// app.listen(PORT, () =>{
//     console.log("Server started on PORT:", PORT);
// })

// [3] Connect to Db
// import express from "express";
// import notesRoutes from "./routes/notesRoutes.js"
// import {connectDB} from "../config/db.js"


// const app = express();

// connectDB();

// app.use("/api/notes", notesRoutes);

// app.listen(5001, () =>{
//     console.log("Server started on PORT: 5001");
// })


//----------------------------------------------

// [2] Create a simple API
// import express from "express"

// const app = express()

// app.get("/api/notes", (req,res) => {
//     res.send("you got 5 notes");
// });

// app.listen(5001, () =>{
//     console.log("Server started on PORT: 5001")
// });

//----------------------------------------------

// [1] Simple script to run the backend
// import express from "express"

// const app = express()

// app.listen(5001, () =>{
//     console.log("Server started on PORT: 5001")
// });