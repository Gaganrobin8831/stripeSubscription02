const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    customerId: {
        type: String,
        required: true,

    },
    productId: {
        type: String,
        
    },
    priceId: {
        type: String,
        required: true,
    },
    subscriptionId: {
        type: String,
             
    },
    planName: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'usd',
    },
    interval: {
        type: String,
        default: 'month',
    },
    intervalCount: {
        type: Number,
        default: 1,
    },
    status: {
        type: String,
        required: true,
        default: 'active', // Possible values: 'active', 'canceled', 'past_due', etc.
    },
    startDate: {
        type: Date,
        default: Date.now,
    },
    endDate: {
        type: Date,
    }
},{timestamps:true}
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
