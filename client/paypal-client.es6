result = function(r){
    console.log(r);
};

errorCB = function(err){
    console.error(err);
};

Meteor.startup(function(){

    // PayPal.execute() when user is on a 'return_url'
    var ready = new ReactiveVar(false), urlDep = new Tracker.Dependency, route, settings, getUrl;

    settings = Meteor.settings;
    settings = settings.public ? settings.public.paypal : null;

    getUrl = function(){
        urlDep.depend();
        return window.location.origin + window.location.pathname;
    };

    (function(){
        var cacheUrl = getUrl();
        Meteor.setInterval(function(){
            // Changed
            if(cacheUrl !== getUrl()){
                cacheUrl = getUrl();
                urlDep.changed();
            }
        }, 500);
    })();

    if(!settings){
        Meteor.subscribe('paypal-config', function(){
            ready.set(true);
        });
    }
    else{
        ready.set(true);
    }

    // Tweak it so devs can provide a callback when execute === true
    Tracker.autorun(function(c){

        // Wait for sub to be ready
        if(!ready.get()){ return; }

        route = !settings ? PayPal.config.findOne().redirect_urls : settings.redirect_urls;

        route = route ? route.return_url : null;

        if(!route){ throw new Error('paypal-no-config', 'Could not find configuration for PayPal'); }

        if(getUrl() === route){
            console.log('You are on a return_url');
            console.log('Executing payment...');

            // Execute PayPal method
            var configId, payerId = getURLParameter('PayerID'), paymentId = getURLParameter('paymentId');

            if(!payerId || !paymentId){ return console.error('Required params not found'); }

            // TODO: Allow users to add configuration id dynamically & add a cb
            // PayPal.execute('zWWj74dzZaySReoCT', paymentId, payerId).then(result).catch(result);
            PayPal.execute(paymentId, payerId).then(result).catch(errorCB);
        }
        else{
            console.log('You are NOT on a return_url');
            // Don't do shit
        }
    });
});