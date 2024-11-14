const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');



const usermodel = require('./models/mongo')
const postmodel = require('./models/posts')

app.use(express.json());
app.use(express.urlencoded({extended : true}));
app.set('view engine', 'ejs');
app.use(cookieParser());

const isLoggedIn = (req , res , next) => {
    if(req.cookies.token === ""){
        res.redirect("/login")
    }
    else{
        let data = jwt.verify(req.cookies.token , "shhhh") ;
        req.data = data
        next()
    }
}

app.get("/", function(req, res) {
    
    res.render("index")
});
app.post("/register" , async function(req , res){
    const {name,email,password,username,age} = req.body ;

    const user = await usermodel.findOne({email});
    if(user) return res.redirect("/login")

    bcrypt.genSalt(10 ,function(err , salt){
        bcrypt.hash(password , salt , async function(err, hash){
            const createduser = await usermodel.create({
                name ,
                username ,
                password : hash ,
                age ,
                email ,
            })
            
        });
    })
    res.redirect("/login")
})
app.get("/login",function(req,res){
    res.render("login")
})
app.post("/login" , async function(req , res){
    const {email,password} = req.body ;

    const user = await usermodel.findOne({email});
    if(!user) return res.send("something went wrong!")
    
    
    bcrypt.compare(password,user.password,function(err,result){
        if(result){
            let token = jwt.sign({email},"shhhh")
            res.cookie("token" , token) ;
            res.redirect("/profile");
        }
        else{
            res.send("something went wrong!");
        }
    })
    
})
app.get("/logout",function(req,res){
    res.cookie("token" , "")
    res.redirect("/login")
})
app.get("/profile", isLoggedIn , async function(req,res){
    const user = await usermodel.findOne({email : req.data.email});
    const posts = await postmodel.find({ user : user._id})
    console.log("your posts "+posts);
    console.log(posts);
    res.render("profile", {user , posts})

})
app.get("/like/:postid", isLoggedIn , async function(req,res){
    const post = await postmodel.findOne({_id : req.params.postid})
    if((post.likes.indexOf(req.data.email)) === -1){
        post.likes.push(req.data.email)
    }else{
        post.likes.splice(post.likes.indexOf(req.data.email) , 1 )
    }
    await post.save()
    res.redirect(`/profile`)
})
app.get("/feed/like/:postid", isLoggedIn , async function(req,res){
    const post = await postmodel.findOne({_id : req.params.postid})
    if((post.likes.indexOf(req.data.email)) === -1){
        post.likes.push(req.data.email)
    }else{
        post.likes.splice(post.likes.indexOf(req.data.email) , 1 )
    }
    await post.save()
    res.redirect(`/feed`)
})
app.get("/edit/:postid", isLoggedIn , async function(req,res){
    const post = await postmodel.findOne({_id : req.params.postid})
    res.render("edit", { post });

    
})
app.post("/update/:postid", isLoggedIn , async function(req,res){
    const post = await postmodel.findOneAndUpdate({_id : req.params.postid} , {content : req.body.content})
    res.redirect("/profile");

    
})
app.post("/createpost", isLoggedIn , async function(req,res){
    const user = await usermodel.findOne({email : req.data.email});
    const {content , ImageUrl } = req.body;
    console.log(ImageUrl);
    
    const post = await postmodel.create({
        user : user._id ,
        content ,
        ImageUrl ,
        username : user.username
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile")
})
app.get("/feed" , async function(req , res) {
    const allposts = await postmodel.find();
    console.log(allposts , "all posts");
    res.render("feed" , {posts:allposts})
})



app.listen(3000)