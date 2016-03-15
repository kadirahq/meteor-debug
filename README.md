# Kadira Debug

Full Stack Debugging Solution for Meteor

![Kadira Debug - Full Stack Debugging Solution for Meteor](https://cldup.com/8qVDtF7NtP.png)

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

### Using With Production Apps

You can even debug your production Meteor app with Kadira Debug. For that, you need to use Kadira Debug version 3.0 or a later version.

In order to allow secure communication, you need to configure your app with a key when you are deploying your app. [Click here](http://support.kadira.io/knowledgebase/articles/808611-configuring-kadira-debug-for-production-app) to learn more about it.

After that, you can use Kadira Debug to debug your app and **share** your debugging session with your teammates.

> **Note:** Sharing works with production apps only.

## FAQ

#### How does it work?

Kadira Debug UI directly connects to your app via DDP. Then it can collect data from both your server and the browser and display it in the [Kadira Debug management console](http://debug.kadiraio.com/debug). If you'd like to learn more, why don't you hack this repo? :)

#### Does it affect the performance of my app?

Not necessarily. Kadira Debug collects, aggregates and sends data in an effective way. So, it won't add any noticeable overhead to your app. If it does, open an issue. We'd love to fix it.

#### Is it secure?

Kadira Debug simply connects to your app and get information and display it to you. In production, it's protected with a secret key. In production mode, we suggest you to use Kadira Debug only with SSL enabled apps.

#### Why isn't management console using HTTPS?

Did you notice we're using a different domain for Kadira Debug management console? Here it is: `http://debug.kadiraio.com/debug`. That's because of a security feature of modern browsers.

Browsers restrict HTTPS web pages from accessing non-HTTPS content. So, if we serve Kadira Debug on a `*.kadira.io` domain with HTTPS, we can't connect to localhost. That's why we're using a separate domain without HTTPS.

**For your production app, we'll open a HTTPS DDP connection for actual data communication.**

#### It seems like Kadira can access all my data. Isn't it?

Nope. Kadira Debug data is stored on two small capped collections (50mb each) in your MongoDB database, and these data won't be sent to Kadira for any reason. Kadira Debug management console simply connects to your app using DDP so that you can access that data.
(Kadira Debug management console is a 100% client-side app.)

So, your data remain with your app and Kadira can't see any of it. You can take a look at thus Meteor package for more information.

#### Is it Open Source?

Yes and No. Checkout this repo. It's the core of Kadira Debug and how we collect data. It's open source under MIT. But, our Kadira Debug UI is not open source.

#### What if I don't have a Kadira Account?

You don't need to have a Kadira or Meteor Account to use Kadira Debug. But, you should try to create an account :)

#### Does it work with Nitrous.io or in the cloud development environments?

Yes, it does. In "Nitrous.io", your app runs as a dev app. So, it'll work. Just enter the app URL.

#### Will it support React?

Soon.

#### I have a different question

Submit an issue on this repo. If you need to send us a private message, send it to `support@kadira.io`.
