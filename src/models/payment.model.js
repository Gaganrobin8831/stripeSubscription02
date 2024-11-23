const mongoose = require('mongoose');
const paymentSchema = new mongoose.Schema({
    customerId: {
        type: String,
        required: true
    },
    sessionId: {
        type: String,
        required: true
    },
    paymentIntentId: {
        type: String
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    paymentStatus: {
        type: String,
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('Payment', paymentSchema);