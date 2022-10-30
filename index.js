import express from 'express';
//Template engine used to present data in browser
import hbs from 'hbs';
import flash from 'connect-flash';
import session from'express-session';
import axios from 'axios';
//Package used to get details(user profile) from github  
import { Octokit } from "octokit";
//to keep common data
import dotenv from 'dotenv';
dotenv.config({path: './.env'});
//to defined __dirname in ES module scope
import path  from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//Create a instance of express library
const app = express();
//Use middleware in express to get data from request perticularly from post methoid and encode it 
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(session({
    secret: 'abcdefgf1234569',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

//Use hbs template engine and static paths
const static_path = path.join(__dirname, "/public");  //find index.html inside public if not found then run template/index.hbs
const template_path = path.join(__dirname, "views/templates");
const partial_path = path.join(__dirname, "views/partials");  
//If we are using HTML in public folder then set view engine html else hbs
app.use("/public", express.static(static_path));
/*using new template engine hbs*/
app.set('view engine', 'hbs');
app.set('views', template_path);
hbs.registerPartials(partial_path);
hbs.registerHelper('alterClass', function(index) {
    index = index % (arguments.length - 2); // -2 to leave out `index` and the final argument HB adds
    return arguments[index + 1];
});

//Prepare server to listen
const PORT  = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', (err, res)=>{
    if(err) throw err;
    console.log(`Application running on port http://localhost:${PORT}`);
});

// Octokit.js
// https://github.com/octokit/core.js#readme
var octokit;
var token;
const refreshToken = () =>{
    octokit = new Octokit({
        auth: token || process.env.GITHUB_ACCESS_TOKEN,
        //auth: token,
        // Authorization: `token ${process.env.GITHUB_TOKEN}`,
        // Accept: 'application/vnd.github.machine-man-preview+json'
    });
}
refreshToken();

//Create API's 
app.get('/', (req, res)=>{
    res.render('index');
});

app.get('/user-profile', async(req, res)=>{
    octokit.request('GET /user', {})
    .then((result)=>{
        res.render('user-profile', {flashMessage:{isFlash:true, "message":"Users git profile details fetch successfully!"}, showNewTokenFields:false,  gitHubProfile:result.data});
    })
    .catch((err)=>{
        res.render('user-profile', {flashMessage:{isFlash:true, 'message':req.flash('message')},showNewTokenFields:true,  gitHubProfile:{}});
    });       
});

app.post('/fetch-user-profile', async(req, res)=>{
    try{
        const username = req.body.username || "Im-Programmatist";
        token = req.body.accesstoken || process.env.GITHUB_ACCESS_TOKEN;
        refreshToken();
        //const result = await octokit.request('GET /user', {})
        // const result = await octokit.request(`GET /users/${email}/hovercard`, {
        //     username: email
        // });
        const result = await octokit.request(`GET /users/${username}`, {
            username: username
        });
        res.render("user-profile",{flashMessage:{isFlash:true, "message":"Users git profile details fetch successfully!"}, gitHubProfile:result.data});
    }catch(err){
        //token=undefined;
        req.flash('message', "Token Expired! Please refresh token.");
        res.redirect("/user-profile");
    }   
});

app.get('/git-repo-list', async(req, res)=>{
    try{
        refreshToken();
        const result = await octokit.request('GET /user/repos',{ type :'all'});
        res.render('git-repo-list',{flashMessage:{isFlash:true, "message":"Users all git repositories listed below!"}, gitRepoList:result.data});
    }catch(err){
        //token=undefined;
        req.flash('message', "Token Expired! Please refresh token.");
        res.redirect("/user-profile");
    }
});

app.get('/git-repo-detail/:repo_name?/:owner?', async(req,res)=>{
    try{
        const OWNER = req.params.owner;
        const REPO = req.params.repo_name;
        const result = await octokit.request('GET /repos/{owner}/{repo}', {
            owner: OWNER,
            repo: REPO
        });
        await octokit.request('GET /repos/{owner}/{repo}/contents/{path}?ref=developer', {
            owner: OWNER,
            repo: REPO,
            path: "README.md"
        }).then((data)=>{
            let buff = new Buffer( data.data.content, 'base64');
            let text = buff.toString('ascii');
            result.data.fileContent = text || "";
        }).catch((err)=>{
            result.data.fileContent = err.message;
        });
        
        await axios.get(`https://api.github.com/repos/${OWNER}/${REPO}/contents/`)
        .then((res) => {
            result.data.noOfFiles = res.data.length;           
        }).catch((err) =>  {
            result.data.noOfFiles = 0;
        });
        
        res.render('git-repo-details', {gitRepoDetails: result.data});

    }catch(err){
        console.log(err);
        //token=undefined;
        req.flash('message', "Token Expired! Please refresh token.");
        res.redirect("/user-profile");
    }
});

app.get('/webhook/:repo_name?/:owner?', async(req, res)=>{
    const OWNER = req.params.owner;
    const REPO = req.params.repo_name;
    console.log(token);
    await octokit.request('GET /repos/{owner}/{repo}/hooks/', {
        owner: OWNER,
        repo: REPO
    }).then((data)=>{
        console.log("data: ",data);
    }).catch((err)=>{console.log("err: ",err);});
})