# Kadira Debug [![Build Status](https://travis-ci.org/kadirahq/meteor-debug.svg?branch=master)](https://travis-ci.orgkadirahq/meteor-debug)

Full Stack Debugging Solution for Meteor

![Kadira Debug - Full Stack Debugging Solution for Meteor](https://cldup.com/pQDQPc4rjT.png)

Kadira Debug **helps** you to identify what's happening behind your Meteor app including both **client** and the **server** code. Based on that information, you can **improve** the performance of your app and make it **faster**.

It'll also helps you to **fix** hard to debug UI issues.

## Getting Started

First add following package to your app:

~~~js
meteor add kadira:debug
~~~


* Then run your app. (Let's assume your app runs on port 3000)
* After that, visit <http://debug.kadiraio.com/debug>
* Then connect to `http://localhost:3000` from the Kadira Debug UI

Now, you'll be able to see what's happening in your app as you interact with your app.

---

If you'd like to learn more about the Kadira Debug UI and how to interpret it, watch the following video:

[![](https://cldup.com/eDEvWF2VMT.png)](https://www.youtube.com/watch?v=lrAYlayAWMI)

## FAQ

#### How does it work?

Kadira Debug UI directly connects to your locally running app via DDP. Then it can collect data from both your server and the browser and display it in a nice interface. If you'd like to learn more, why don't you hack this repo? :)

#### Does it affect the performance of my app?

Not necessarily. Kadira Debug collects, aggregates and sends data in an effective way. So, it won't add any noticeable overhead to your app. If it does, open an issue. We'd love to fix it.

#### Is it secure?

Kadira Debug is a `debugOnly` package. It will **_not_** go into the production build. It also does not send or route data outside of your machine. Kadira Debug UI directly connects to your app via DDP. No proxies. No hacks.

#### Why isn't it HTTPS?

Did you notice we're using a different domain for Kadira Debug? Here it is: `http://debug.kadiraio.com/debug`. That's because of a security feature of modern browsers. 

Browsers restrict HTTPS web pages from accessing non-HTTPS content. So, if we serve Kadira Debug on a `*.kadira.io` domain with HTTPS, we can't connect to localhost. That's why we're using a seperate domain without HTTPS.

**This is secure since we don't communicate with Kadira Servers inside Kadira Debug. Even if we do, we'll use some other techniques to make sure the DDP connection is always secure.**

#### Is it Open Source?

Yes and No. Checkout this repo. It's the core of Kadira Debug and how we collect data. It's open source under MIT. But, our Kadira Debug UI is not open source.

#### Is it FREE?

Yes, it is. We'll never block/restrict any debug-related features. But, we'll add a few value-added services like sharing and remote debugging.

#### What if I don't have a Kadira Account?
You don't need to have a Kadira or Meteor Account to use Kadira Debug. But, you should try to create an account :)

#### Does it work with Nitrous.io or in the cloud?
Yes, it does. In "Nitrous.io", your app runs as a dev app. So, it'll work. Just enter the app URL. Likewise, it'll work with any other cloud development environment. Additionally, Kadira Debug also works if you deploy your app with the debug mode (`--debug`).

#### Will it support React?

React is becoming the standard for UI components. Meteor is supporting it officially soon. So, it's a shame we wouldn't support it.

#### I've a different question?

Submit an issue on this repo. If you need to send us a private message, send it to `support@kadira.io`.
