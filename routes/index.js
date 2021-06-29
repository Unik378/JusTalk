const express = require('express');
const Room = require('../models/Rooms');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const util = require('util')

const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// Welcome Page
router.get('/', forwardAuthenticated, (req, res) => res.render('welcome'));

// Dashboard
router.get('/dashboard', ensureAuthenticated, (req, res) =>{

  Room.find({users: {$elemMatch: {userId:req.user.id}}} , (err, docs) => {
    if(err)
    {
      console.log(err)
    }else{

      docs.sort( (a,b) => {
        return new Date(b.messages[b.messages.length-1].Date) - new Date(a.messages[a.messages.length-1].Date);
      })

      res.render('dashboard', {
        user: req.user,
        rooms: docs
      })
    }
  })
});

// Join Page
router.get('/createroom', ensureAuthenticated, (req, res) => {
  res.render('createroom')
})

// Create Page
router.get('/joinroom', ensureAuthenticated, (req, res) => {
  res.render('joinroom')
})

// Create handle
router.post('/createroom', ensureAuthenticated, (req, res) => {
  const { name, password, password2 } = req.body;
  let errors = [];

  if (!name || !password || !password2) {
    errors.push({ msg: 'Please enter all fields' });
  }

  if (password != password2) {
    errors.push({ msg: 'Passwords do not match' });
  }

  if (password.length < 6) {
    errors.push({ msg: 'Password must be at least 6 characters' });
  }

  if (errors.length > 0) {
    res.render('createroom', {
      errors,
      name,
      password,
      password2
    });
  } else {
    Room.findOne({ name: name }).then(room => {
      if (room) {
        errors.push({ msg: 'Room already exists' });
        res.render('createroom', {
          errors,
          name,
          password,
          password2
        });
      } else {
        const newRoom = new Room({
          name: name,
          password: password,
          users: [{userId:req.user.id,name:req.user.name}],
          messages: [{
            msg: `${req.user.name} created room "${name}"`,
            userSent: {userId: 'bot', name: 'bot'},
            Date : new Date()
          }],
          createdBy: req.user.id
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newRoom.password, salt, (err, hash) => {
            if (err) throw err;
            newRoom.password = hash;
            newRoom
              .save()
              .then(room => {

                User.updateOne({ _id: req.user.id },
                  { $push: { rooms: name } }, function (err, docs) {
                    if (err) {
                      console.log(err)
                    }
                    else {
                      console.log("Room added");
                      res.redirect('/dashboard');
                    }
                  });
              })
              .catch(err => console.log(err));
          });
        });
      }
    });
  }
});

// Join handle
router.post('/joinroom', ensureAuthenticated, (req, res) => {
  const { name, password } = req.body;

  Room.findOne({ name: name }).then(room => {
    if (room) {

      users = room.users

      if (!users.includes(req.user.id)) {

        bcrypt.compare(password, room.password, (err, isMatch) => {
          if (err) throw err;
          if (isMatch) {

            User.updateOne({ _id: req.user.id },
              { $push: { rooms: name } }, function (err, docs) {
                if (err) {
                  console.log(err)
                }
                else {
                  // console.log("Updated Docs : ", docs);
                }
              });

            Room.updateOne({ name: name },
              { $push:  {  users: {userId:req.user.id, name: req.user.name} }}, function (err, docs) {
                if (err) {
                  console.log(err)
                }
                else {
                  // console.log("Updated Docs : ", docs);
                }
              });

              newMessage = {  msg: `${req.user.name} joined`,
                              userSent: {userId: 'bot', name: 'bot'},
                              Date : new Date()
                            }
              Room.updateOne({ name: name },
                {$push:  { messages: newMessage} 
                }, function (err, docs) {
                  if (err) {
                    console.log(err)
                  }
                  else {
                    // console.log("Updated Docs : ", docs);
                  }
                });

            req.app.io.to(name).emit('user-joined' ,{userId: req.user.id,userName: req.user.name,Date:newMessage.Date, room: name} )
            res.redirect('/dashboard');
          }
          else {
            req.flash('error_msg', 'Password Incorrect')
            res.redirect('/joinroom')
          }
        });
      }
      else {
        req.flash('error_msg', 'Room already joined')
        res.redirect('/joinroom')
      }

    }
    else {
      req.flash('error_msg', 'Room does not exist')
      res.redirect('/joinroom')
    }
  })
});


module.exports = router;