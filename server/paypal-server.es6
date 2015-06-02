var paypalSDK, paymentExecute;

paypalSDK = Npm.require('paypal-rest-sdk');

// TODO: Add authentication to each method
// TODO: Add multi-product support

// Payment methods
Meteor.methods({
    'paypal-create'(product){
        product.price = product.price.toString();
        product.quantity = product.quantity.toString();
        product.amount.total = product.amount.total.toString();

        check(product, 
            Match.OneOf({
            name: String,
            sku: String,
            price: String,
            currency: String,
            quantity: String,
            amount: {
                currency: String,
                total: String
            },
            description: String
        }, Array));

        var self = this, userId = self.userId, paypalPaymentInfo, info, config, result, returnUrl, cancelUrl, transaction, paymentCreate;

        paymentCreate = Meteor.wrapAsync(paypalSDK.payment.create, paypalSDK.payment);

        config = PayPal.configure();

        // Throw if there is no configuration
        if(!config){
            throw new Meteor.Error('no-config', 'Could not find a configuration for paypal');
        }

        paypalSDK.configure(config);

        returnUrl = config.redirect_urls.return_url;
        cancelUrl = config.redirect_urls.cancel_url;

        if(!returnUrl || !cancelUrl){
            throw new Meteor.Error('empty-url', 'Empty return_url or cancel_url');
        }

        // Construct payment object
        paypalPaymentInfo = {
            "intent": "sale",
            "payer": {
                "payment_method": "paypal"
            },
            "redirect_urls": {
                "return_url": returnUrl,
                "cancel_url": cancelUrl
            },
            "transactions": []
        };

        // TODO: Support multiple products
        transaction = {
            "item_list": {
                "items": [{
                    "name": product.name,
                    "sku": product.sku,
                    "price": product.price,
                    "currency": product.currency,
                    "quantity": product.quantity
                }]
            },
            "amount": {
                "currency": product.amount.currency,
                "total": product.amount.total
            },
            "description": product.description
        };

        // if(product instanceof Array){
        //     product.forEach(product => {
        //         paypalPaymentInfo.transactions.push(product);
        //     });
        // }
        // else{
            paypalPaymentInfo.transactions.push(transaction);
        // }

        // Create PayPal payment
        try{
            result = paymentCreate(paypalPaymentInfo);
        }
        catch(error){
            throw new Meteor.Error(error.response);
        }


        if(result.state !== 'created'){

            // Log error
            let payment = {
                paymentId: result.id,
                provider: 'paypal',
                action: 'create',
                time: result.create_time,
                httpStatusCode: result.httpStatusCode,
                response: result,
                userId,
                productId: product.sku,
                couponCode: couponCode || null
            };

            PaymentErrors.insert(payment);

            // Throw meteor error
            throw new Meteor.Error('paypal-payment-not-created', 'Failed to create PayPal payment');
        }

        // Include user info if possible
        user = Meteor.users.findOne(userId);

        let payment = {
            paymentId: result.id,
            productId: product.sku,
            createdAt: new Date(),
            state: 'created',
            provider: 'paypal',
            quantity: product.quantity,
            sku: product.sku,
            productName: product.name,
            currency: product.currency,
            price: product.price,
            userId,
            user,
            amount: {
                currency: product.amount.currency,
                total: product.amount.total
            },
            description: product.description
        };

        Payments.insert(payment);

        return _.findWhere(result.links, { rel: 'approval_url' }).href;
    },
    'paypal-execute'(options){
        check(options, {
            paymentId: String,
            payerId: String
        });

        var paymentId, payerId;

        paymentId = options.paymentId;
        payerId = options.payerId;

        var payment, user, userId, executePayment, result, config, paymentExecute, self = this;

        paymentExecute = Meteor.wrapAsync(paypalSDK.payment.execute, paypalSDK.payment);
        payment = Payments.findOne({ provider: 'paypal', paymentId });

        userId = this.userId;

        // Get config
        config = PayPal.configure();

        if(!config){
            let msg = 'paypal-no-config';
            throw new Meteor.Error(msg, 'Failed to load specified paypal configuration');
        }

        // Set config
        paypalSDK.configure(config);

        if (!payment) {
            let msg = 'paypal-payment-not-found';
            throw new Meteor.Error(msg);
        }

        // Block 
        if(PayPal._validateProcessAttempt && !PayPal._validateProcessAttempt(options)){
            let msg = 'paypal-payment-processing-blocked';
            throw new Meteor.Error(msg);
        }

        // Process Payment
        try{
            result = paymentExecute(paymentId, { payer_id: payerId });
        }
        catch(error){
            PayPal._onPaymentError(error);
            throw new Meteor.Error(error);
        }

        // Get user info
        user = Meteor.users.findOne(userId);

        _.extend(result, { user, self });

        // Update Payment state
        Payments.update(payment._id, { $set: { state: result.state, closedAt: new Date() } });
        
        if(result.state !== 'approved'){
            let msg = 'paypal-payment-not-approved';

            let errorResult = {
                paymentId: result.id,
                provider: 'paypal',
                action: 'create',
                time: result.create_time,
                httpStatusCode: result.httpStatusCode,
                response: result,
                userId,
                productId: product.sku,
                couponCode: couponCode || null
            };

            PaymentErrors.insert(errorResult);

            PayPal._onPaymentError(errorResult, new Error(msg));

            throw new Meteor.Error(msg);
        }

        PayPal._onPaymentSuccess(result);

        // Allow users to execute other methods when done
        return true;
    }
});

// Payment configuration methods
Meteor.methods({
    'paypal-set-config'(configId){
        check(configId, String);
        var config = PayPal.config.findOne(configId);

        PayPal.configure(config);

        return config ? true : false;
    },
    'paypal-redirect-urls'(){
        var config  = PayPal.configure();

        if(!config){ throw new Meteor.Error('no-config', 'Could not find a configuration for paypal'); } 
        return config.redirect_urls;
    },
    'paypal-new-config'(config){
        check(config, Object);

        return PayPal.config.insert(config);
    },
    'paypal-mode'(configId, _mode){
        check(configId, String);
        check(_mode, String);

        return PayPal.config.update(configId, { $set: { mode: _mode }});
    },
    'paypal-client-id'(configId, _client_id){
        check(configId, String);
        check(_client_id, String);

        return PayPal.config.update(configId, { $set: { client_id: _client_id }});
    },
    'paypal-client-secret'(configId, _client_secret){
        check(configId, String);
        check(_client_secret, String);

        return PayPal.config.update(configId, { $set: { client_secret: _client_secret }});
    },
    'paypal-return-url'(configId, returnUrl){
        check(configId, String);
        check(returnUrl, String);

        return PayPal.config.update(configId, { $set: { 'redirect_urls.return_url': returnUrl }});
    },
    'paypal-cancel-url'(configId, cancelUrl){
        check(configId, String);
        check(cancelUrl, String);

        return PayPal.config.update(configId, { $set: { 'redirect_urls.cancel_url': cancelUrl }});
    },
});

Meteor.publish('paypal-config', function(){
    return PayPal.config.find();
});