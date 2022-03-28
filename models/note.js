const mongoose = require('mongoose');

const NoteSchema = mongoose.Schema({

    title: {
        type: String,
        required: true
    } ,

    body: {
        type: String,
        required: true
    },

    image:{
        type: String,
        required: true
    },

    timeAdded: {
        type: String,
        required: true
    }

}, {timestamps: true});

const Note = module.exports = mongoose.model('Note', NoteSchema);