import express from 'express';
//Template engine used to present data in browser
import hbs from 'hbs';
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
console.log("Current project directory is -: ",__dirname);

//Create a instance of express library
const app = express();
//Use middleware in express to get data from request perticularly from post methoid and encode it 
app.use(express.json());
app.use(express.urlencoded({extended: true}));

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
const PORT  = process.env.PORT || 4040;
app.listen(PORT, 'localhost', (err, res)=>{
    if(err) throw err;
    console.log(`Application running on port http://localhost:${PORT}`);
});

// Octokit.js
// https://github.com/octokit/core.js#readme
var octokit;
var token;
const refreshToken = () =>{
    console.log("Aut token - ", process.env.GITHUB_ACCESS_TOKEN);
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
    // res.writeHead(200,{'Content-Type': 'application/json'});
    // res.write("Welcome To Git Scanner");
    // res.end();
    res.render('index');
});

app.get('/user-profile', async(req, res)=>{
    // const result = await octokit.request('GET /user', {})
    // // const result = await octokit.request(`GET /users/${email}/hovercard`, {
    // //     username: email
    // // });
    // console.log(result.data);
    // res.render('user-profile', {flashMessage:{isFlash:true, "message":"Users git profile details fetch successfully!"}, gitHubProfile:result.data});
    res.render('user-profile', {flashMessage:{isFlash:true},  gitHubProfile:{}});
});

app.post('/fetch-user-profile', async(req, res)=>{
    try{
        const username = req.body.username || "Im-Programmatist";
        token = req.body.accesstoken;
        refreshToken();
        console.log("username is - ",username, typeof username === 'string');
        //const result = await octokit.request('GET /user', {})
        // const result = await octokit.request(`GET /users/${email}/hovercard`, {
        //     username: email
        // });
        const result = await octokit.request(`GET /users/${username}`, {
            username: username
        })
        res.render("user-profile",{flashMessage:{isFlash:true, "message":"Users git profile details fetch successfully!"}, gitHubProfile:result.data});
    }catch(err){
        token=undefined;
        res.render("user-profile",{flashMessage:{isFlash:true, "message":"Token refresh failed"}});
    }   
});

app.get('/git-repo-list', async(req, res)=>{
    try{
        const result = await octokit.request('GET /user/repos',{});
        res.render('git-repo-list',{flashMessage:{isFlash:true, "message":"Users all git repositories listed below!"}, gitRepoList:result.data});
    }catch(err){
        token=undefined;
        res.render("user-profile",{flashMessage:{isFlash:true, "message":"Token refresh failed"}});
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
        //console.log(Object.getOwnPropertyNames(result.data));
    
        res.render('git-repo-details', {gitRepoDetails: result.data});
    }catch(err){
        token=undefined;
        res.render("user-profile",{flashMessage:{isFlash:true, "message":"Token refresh failed"}});
    }
});
