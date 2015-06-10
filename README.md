# Kadira Debug

Full Stack Debugging Solution for Meteor

![Kadira Debug - Full Stack Debugging Solution for Meteor](https://cldup.com/pQDQPc4rjT.png)

Kadira Debug **helps** you to identify what's happening behind your Meteor app including both **client** and the **server** code. Based on that information, you can **improve** the performance of your app and make it **faster**.

It'll also helps you to **fix** hard to debug UI issues.

## Getting Started

First add following package to your app:

~~~js
meteor add meteorhacks:kadira-debug
~~~


* Then run your app. (Let's assume your app runs on port 3000)
* After that, visit <http://new.kadira.io/debug>
* Then connect to `http://localhost:3000`

Now, you'll be able to see what's happening in your app as you interact with your app.

---

If you like to learn more about the Kadira Debug UI and how to interpret it, watch following video:

...

## FAQ

#### How does it work?

Kadira Debug web app directly connect to your locally running app via DDP. Then it can collect data from both your server and the browser and display in a nice interface. If you like to learn more, why don't you hack this repo :)

#### Does it affect the performance of my app?

Not necessarily. Kadira Debug collect, aggregate and send data in an effective way. So, it won't add any noticeable overhead to your app. If it does, open an issue. We'd love to fix it.

#### Is it secure?

Kadira debug is a `debugOnly` package. So, it won't goes into the production build. It also does not send or route data outside of your machine. Kadira Debug UI is directly connects to your app via DDP; no proxies or hacks.

#### Is it Open Source?

Yes and No. Check this repo. It's the core of Kadira Debug and how we collect data. It's Open Source under MIT. But, our Kadira Debug UI is not open source.

#### Is it FREE?

Yes it is. We'll never charge/block any debug related features. But, we'll add few value added services like sharing and remote debugging.

#### Will it support React?

React is becoming the de-facto standard for UI components. Meteor is supporting it soon officially. So, we'll support it soon.

#### I've a different question?

Submit an issue on this repo. If you need to send us a private message send it to `support@kadira.io`.