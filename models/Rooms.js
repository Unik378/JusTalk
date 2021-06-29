const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  users: {
    type: [{
      name: String,
      userId: String
    }],
    default: []
  },
  messages: {
    type: [{
        msg: String,
        userSent: {userId: String, name: String},
        Date : Date
    }],
    default: []
  },
  createdBy: {
      type: String,
      required: true
  },
  date: {
    type: Date,
    default: new Date()
  }
});

const Room = mongoose.model('Rooms', RoomSchema);

module.exports = Room;
