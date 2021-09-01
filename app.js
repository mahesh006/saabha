var bodyParser = require("body-parser");
var express = require("express");
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const morgan = require('morgan')
var path = require('path');
var app = express();
var server = require('http').createServer(app);
const methodOverride = require('method-override')
const passport = require('passport')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const connectDB = require('./config/db')
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
const { ensureAuth, ensureGuest } = require('./middleware/auth')

// Load config
dotenv.config({ path: './config/config.env' })

// Passport config
require('./config/passport')(passport)

connectDB()

server.listen(port, function(){
    console.log("listening on port 3000");
});

// Logging

app.use(morgan('dev'))


// Sessions
app.use(
    session({
      secret: 'keyboard cat',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    })
  )
  

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

const Room = require('./models/Room')


io.on('connection', function(socket){

    //VIDEO========================================
    
    io.to(socket.handshake.query.roomName).emit('newUser');
    socket.join(socket.handshake.query.roomName, function(){
        io.to('${socketId}').emit('newUser');
    });
    socket.on('requestCurrentVideo', function(url, room){
        //emit a signal that asks for current videoID and time
    });
    socket.on('play', function(room){
        console.log('State: play');
        io.to(room).emit('playPlayer');
    });
    socket.on('pause', function(room){
        console.log('State: pause');
        io.to(room).emit('pausePlayer');
    });
    socket.on('buffering', function(time, room){
        console.log('State: buffering: '+time);
        io.to(room).emit('bufferingPlayer', time);
    });
   
    socket.on('playback', function(rate, room){
        console.log('Playback change: '+rate);
        io.to(room).emit('playbackPlayer', rate);
    });
    socket.on('newVideo', function(url, room){
        console.log('New Video!');
        var newVideoID = url.split('v=')[1];
        io.to(room).emit('newVideo', newVideoID);
    });
    socket.on('update', async function(data){
        console.log(data.name);
        
    try {
        const userUpdate = { pin: data.val };
        await Room.findOneAndUpdate({ _id: data.name }, userUpdate, {
            new: true,
            
          })
    }catch{
        console.log('error')
    }
        
    });

});


//--------------------------------------------------

app.get('/sabhaa/main', ensureAuth, function (req, res) {
  res.render(__dirname + '/views/index.ejs');
});

app.post("/sabhaa/main", ensureAuth, function(req, res){
    var roomName = req.body.roomName;

    res.redirect("/room/" + roomName);
});

app.get("/room/:id", ensureAuth, function(req, res){
    res.render("room", {roomName: req.params.id});
});


app.get('/sabhaa/login', ensureGuest, function (req, res) {
    res.render(__dirname + '/views/login.ejs');
});

app.get('/google', passport.authenticate('google', { scope: ['profile'] }))

// @desc    Google auth callback
// @route   GET /auth/google/callback
app.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/sabhaa/main')
  }
)

// @desc    Logout user
// @route   /auth/logout
app.get('/logout', (req, res) => {
  req.logout()
  res.redirect('/sabhaa/login')
})


app.get('/dashboard', ensureAuth, async (req, res) => {
    try {
      const rooms = await Room.find({ user: req.user.id }).lean()
      res.render('dashboard.ejs', {
        name: req.user.firstName,
        rooms        
      })
    } catch (err) {
      console.error(err)
      res.render('error/500')
    }
  })

app.get('/rooms/add', ensureAuth, (req, res) => {
   res.render(__dirname +'/views/addroom.ejs')
})

app.post('/sabhaa/addroom', ensureAuth, async (req, res) => {
    try {
      req.body.user = req.user.id
      await Room.create(req.body)
      res.redirect('/dashboard')
    } catch (err) {
      console.error(err)
      res.render('error/500')
    }
  })
  
  app.get('/:id', ensureAuth, async (req, res) => {
    try {
      let rooms = await Room.findById(req.params.id).populate('user').lean()
  
      if (!rooms) {
        return res.render('error/404')
      }
  
      if (rooms.user._id != req.user.id && rooms.status == 'private') {
        res.render('error/404')
      } else {
        res.render(__dirname +'/views/show.ejs', {
          rooms,
        })
      }
    } catch (err) {
      console.error(err)
      // res.render('error/404')
    }
  })


app.get('/public/rooms', ensureAuth, async (req, res) => {
    try {
      const rooms = await Room.find({ status: 'public' })
        .populate('user')
        .sort({ createdAt: 'desc' })
        .lean()
  
      res.render(__dirname +'/views/publicrooms.ejs', {
        rooms,
      })
    } catch (err) {
      console.error(err)
      res.render('error/500')
    }
  })

