const express= require('express')
const mongoose= require('mongoose')
require('dotenv').config()
var clc = require("cli-color");
const bcrypt= require('bcryptjs')
const session= require('express-session')
const connectMongoDbSession= require('connect-mongodb-session')(session)


// file-imports
const { userDataValidation, isEmailRgex } = require('./utils/authUtils');
const userModel = require('./models/userModel');
const isAuth = require('./middleware/authMiddleware');
const todoModel = require('./models/todoModel');
const todovalidation = require('./utils/blogUtils');


// constants
const app= express()  // all the capabilities of express are getting store in app
const PORT=8000
const store= new connectMongoDbSession({  // this is the instance of connect-mongodb-session
    uri: process.env.MONGO_URI,
    collection: "sessions"   // plural because we are not creating a collection we are just getting to know where this "sessions"
                            // collection is present
})


// db connection 
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log(clc.yellow.bold("mongodb connected successfully")))
.catch(err => console.log(clc.redBright.bold(err)))

// middlewares
app.set("view engine", "ejs")
app.use(express.urlencoded({extended: true}))  // req.body parsing from urlencoded format
app.use(express.json())   // body parsing from json format
app.use(express.static("public"))   // making public folder static, so that it is readable by the browser
app.use(session({
    secret: process.env.SECRET_KEY,// secret is something that will get included while making the sessionId by encrypting 
                                    //secret's value
    store: store, // store is instance of connect-mongodb-session that tells u where my database is present and it allows the 
                //session to get stored in the Db
    resave: false,
    saveUninitialized: false // when we hit any public api(post(register), get(login)) then session is not generated. so no need to
                            // initialize a session for the public apis. Only when the user logs in then only session gets 
                            // generated. and using that session u can hit pvt apis
}))



app.get("/", (req, res)=>{
    return res.render("homePage")
})


app.get("/test", (req, res)=>{
    return res.render("test.ejs")
})


app.get("/register", (req, res)=>{
    return res.render("registerPage")
})

app.get("/login", (req, res)=>{
    console.log("login page");
    return res.render("loginPage")
})

app.post("/register", async (req, res)=>{
    // console.log(req.body);
    const {name, email, username, password}= req.body
    // validation 
    try{
        await userDataValidation(req.body)
    }
    catch(err){
        return res.status(400).json(err)
    }
    
    
    try {
        // username and email should be unique
        const userEmailExist= await userModel.findOne({email: email})
        console.log("line 60", userEmailExist);
        if(userEmailExist) return res.send("user email already exists in the Db")

        const userUsernameExist= await userModel.findOne({username: username})
        console.log("line 64", userUsernameExist);   // shows the data in the db
        if(userUsernameExist) return res.send("username already exists in the Db")

        // encrypt the password
        const hashedPassword= await bcrypt.hash(password, parseInt(process.env.SALT))

        // store it in Db
        const userObj= new userModel({
            name, email, username, password: hashedPassword
        })

        const userEntry= await userObj.save()
        // return res.status(201).json({
        //     message: "User registered successfully",
        //     data: userEntry
        // })

        return res.redirect("/login")
    } catch (error) {
        // console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            error: error
        })
    }
    
    
})

app.post("/login", async (req, res)=>{
    const {loginId, password}= req.body
    // validation
    if(!loginId || !password) return res.status(400).json("Missing credentials")

    if(typeof loginId!== 'string') return res.status(400).json("login id is not in text format")
    if(typeof password!== 'string') return res.status(400).json("password is not in text format")

    // find the user from the db
    let userEntry={}
    try{
        if(isEmailRgex({key: loginId})){
            userEntry= await userModel.findOne({email: loginId})
            console.log(("login id is email"));
        }
        else{
            userEntry= await userModel.findOne({username: loginId})
            console.log(("login id is username"));
        }

        if(!userEntry) return res.status(400).json("User not found, please register first")


        // compare the password
        const isMatched= await bcrypt.compare(password, userEntry.password)
        console.log(isMatched);
        if(!isMatched) return res.status(400).json("Incorrect password")


        // session based auth
        console.log(req.session);  // undefined when no middleware is passed

        req.session.isAuth=true   // modifying the session so that it gets stored in the db
        req.session.user={  // updating user information to identify, which user this session obj was created for
            userId: userEntry._id,
            username: userEntry.username,
            email: userEntry.email
        }
        // return res.send("login successful")
        return res.redirect("/dashboard")
    }
    catch(err){
        return res.status(500).json("error")
    } 
})

app.get("/dashboard", isAuth, (req, res)=>{
    console.log(req.session);
    // return res.send("Welocome to Dashboard")
    return res.render("dashboardPage")
})

app.post("/logout", isAuth, (req, res)=>{
    req.session.destroy(err =>{    // delets the current session from the db
        if(err) return res.status(500).send("logout unsuccessful")
        return res.status(200).redirect("/login");
    })
    
})


// todo apis
app.post("/create-item", isAuth, async (req,res)=>{
    // validation 
    // console.log(req.body);
    // console.log("session", req.session);
    // const {todo} = req.body
    // if(!todo) return res.json("Item can't be empty")
    // if(typeof todo!== 'string') return res.json("Item has to be in text format")

    try {
        await todovalidation(req.body)
    } catch (error) {
        return res.status(400).json(error)
    }
    

    // storing in the Db
    try{
        const todoObj= new todoModel({
            todo: req.body.todo, username: req.session.user.username
        })
        const todoEntry= await todoObj.save()
        return res.json({message: "Todo created successfully", data: todoEntry})
    }
    catch(err){
        console.log(err);
        return res.json({message: "Internal server error", data: err})
    }
})

app.get("/read-item", isAuth, async (req, res)=>{
    const username= req.session.user.username

    try {
        const todoEntry= await todoModel.find({username: username})
        // console.log("hey boss");
        // console.log(todoEntry);
        if(todoEntry.length===0){
            return res.send({
                status: 204,  // 204 is status for no content
                message: "no todo found"
            })
        }
        return res.send({
            status: 200,
            message: "read sucessful",
            data: todoEntry
        })
    } catch (error) {
        return res.send({
            status: 500,
            message: "Internal server error",
            data: error
        })
    }
})

app.post("/update-item", isAuth, async (req, res)=>{
    const newData= req.body.newData
    const todoId= req.body.todoId
    const username= req.session.user.username

    if(!todoId) return res.status(400).send("todo id is missing")
    try {
        await todovalidation({todo: newData})
    } catch (error) {
        return res.send({
            status: 400,
            message: error
        })
    }


    try {
        const todoEntry= await todoModel.findOne({_id : todoId})
        if(!todoEntry) return res.send({
            status: 400,
            message: "todo not present with this id: "+ todoId
        })

        // check the ownership of todo
        // console.log( username, todoEntry.username);
        if(username !== todoEntry.username){
            return res.send({
                status: 403,
                message: "not allowed to edit the todo"
            })
        }

        // update the todo in the db
        const previousTodo= await todoModel.findOneAndUpdate({_id : todoId}, {todo : newData})
        return res.send({
            status: 200,
            message: "todo updated successfully",
            data: previousTodo
        })
    } catch (error) {
        console.log(error);
        return res.send({
            status: 500,
            message: "Internal server error",
            error: error
        })
    }
})

app.post("/delete-item", isAuth, async (req, res)=>{
    const todoId= req.body.todoId
    const username= req.session.user.username

    if(!todoId) return res.send("todo id is missing")

    try {
        const todoEntry= await todoModel.findOne({_id : todoId})
        if(!todoEntry) return res.send({
            status: 400,
            message: "todo not present with this id: "+ todoId
        })

        // check the ownership of todo
        // console.log( username, todoEntry.username);
        if(username !== todoEntry.username){
            return res.send({
                status: 403,
                message: "not allowed to delete the todo"
            })
        }

        // delete the todo from the db
        const deletedTodo= await todoModel.findOneAndDelete({_id : todoId})
        return res.send({
            status: 200,
            message: "todo deleted successfully",
            data: deletedTodo
        })
    } catch (error) {
        console.log(error);
        return res.send({
            status: 500,
            message: "Internal server error",
            error: error
        })
    }
})

app.listen(PORT, ()=>{
    console.log(clc.yellow.bold.underline("Server is running on port",PORT));
})
