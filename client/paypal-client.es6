Meteor.startup(function(){

    // PayPal.execute() when user is on a 'return_url'
    var ready = new ReactiveVar(false), urlDep = new Tracker.Dependency, getUrl;


    getUrl = function(){
        urlDep.depend();
        return window.location.origin + window.location.pathname;
    };

    (function(){
        var cacheUrl = getUrl();
        Meteor.setInterval(function(){
            // Url changed
            if(cacheUrl !== getUrl()){
                cacheUrl = getUrl();
                urlDep.changed();
            }
        }, 500);
    })();

    PayPal.getConfig().then(function(route){

        // Tweak it so devs can provide a callback when execute === true
        Tracker.autorun(function(c){

            if(getUrl() === route.return_url){
                console.log('You are on a return_url');

                // Execute PayPal method
                var configId, payerId = getURLParameter('PayerID'), paymentId = getURLParameter('paymentId');

                if(!payerId || !paymentId){ return console.error('Required params not found'); }

                console.log('Executing payment...');

                PayPal.execute(paymentId, payerId).then(PayPal._onPaymentSuccess).catch(PayPal._onPaymentError);
            }
            else{
                console.log('You are NOT on a return_url');
                // Don't do shit
            }
        });

    }).catch(function(err){
        console.error(err.message);
    });

});