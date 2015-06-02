PayPal = {};

PayPal.config = new Mongo.Collection('paypal_config');

PayPal.config.attachSchema(new SimpleSchema({
    mode: {
        type: String,
        allowedValues: ['sandbox', 'live']
    },
    client_id: {
        type: String,
        label: 'Client Id'
    },
    client_secret: {
        type: String,
        label: 'Client Secret'

    },
    'redirect_urls.return_url': {
        type: String,
        optional: true
    },
    'redirect_urls.cancel_url': {
        type: String,
        optional: true
    }
}));

// David Morales on SO - http://stackoverflow.com/a/11582513
getURLParameter = function(name){
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
};

result = function(r){
    console.log(r);
};

errorCB = function(err){
    console.error(err);
};

PayPal.configure = function(obj){
    if(obj){
        PayPal.configuration = obj;
        return PayPal.configuration;
    }

    return PayPal.configuration;
};

if(Meteor.isClient){
    // User Defined Function
    // PayPal.configure({
    //     mode: 'sandbox',
    //     client_id: 'sandbox',
    //     client_secret: 'sandbox',
    //     redirect_urls: {
    //         return_url: 'http://localhost:3000/return',
    //         cancel_url: 'http://localhost:3000/cancel'
    //     }
    // });
    // 
    // PayPal.validateProcessAttempt(function(){
    //     return true;
    // });

    PayPal.create = function(product){
        return new Promise(function(resolve, reject){
            if(!product){ return reject(Error('paypal-product', 'Please provide product info')); }

            Meteor.call('paypal-create', product, function(error, result){
                if(error){
                    return reject(error);
                }
                else{
                    return resolve(result);
                }
            });
        });
    };

    PayPal.execute = function(paymentId = getURLParameter('paymentId'), payerId = getURLParameter('PayerID')){
        var self = this;

        return new Promise(function(resolve, reject){
            if(!payerId){ return reject(new Error('payer-id-not-found', 'Failed to retrieve payerId')); }
            if(!paymentId){ return reject(new Error('no-payment-id', 'Please provide a paymentId')); }

            Meteor.call('paypal-execute', { paymentId, payerId }, function(error, result){
                if(error){
                    return reject(error);
                }
                else{
                    return resolve(result);
                }
            });
        });
    };

    PayPal.getConfig = function(){
        return new Promise(function(resolve, reject){
            Meteor.call('paypal-redirect-urls', function(e, r){
                if(e){
                    return reject(e);
                }
                else{
                    return resolve(r);
                }
            })
        });
    };

    PayPal.setConfigById = function(configId){
        return new Promise(function(resolve, reject){
            Meteor.call('paypal-set-config', configId, function(e, r){
                if(e){
                    return reject(e);
                }
                else{
                    return resolve(r);
                }
            })
        });
    };
}

if(Meteor.isServer){
    PayPal.validateProcessAttempt = function(cb){
        if(!cb){ return PayPal._validateProcessAttempt; }

        PayPal._validateProcessAttemp = cb;
        // return a falsy or truthy value
    };
}

PayPal.onPaymentSuccess = function(cb){
    if(!cb){ return PayPal._onPaymentSuccess; }
    PayPal._onPaymentSuccess = cb;
};

PayPal.onPaymentFailure = function(cb){
    if(!cb){ return PayPal._onPaymentError; }
    PayPal._onPaymentError = cb;
};

// Stubs
PayPal._onPaymentError = function(){};
PayPal._onPaymentSuccess = function(){};