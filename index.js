const puppeteer = require('puppeteer-extra')
const fs = require('fs');
const fetch = require('node-fetch');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const [names, , , , surnames] = fs.readFileSync('./baseOfNames.txt', 'utf-8').split('\n');

(async () => {
  while (true) {
    const browser = await puppeteer.launch({ headless: false, slowMo: 50,  args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--lang=en'
    ] });
    await regNewAccount(browser);
    await browser.close();
  }
})();

async function regNewAccount(browser){
  
  const page = (await browser.pages())[0];

  const cookies = fs.readFileSync('./mailru-cookies.json', 'utf8');
  const deserializedCookies = JSON.parse(cookies);
  await page.setCookie(...deserializedCookies); 
  
  const regLink = 'https://account.mail.ru/signup?back=https%3A%2F%2Fe.mail.ru%2Fmessages%2Finbox%3Fauthid%3Dl6sdg4ve.8rs%26back%3D1%26dwhsplit%3Ds10273.b1ss12743s%26from%3Dlogin%26mt_click_id%3Dmt-y7s979-1660423780-588292344%26mt_sub1%3Dmail.ru%26mt_sub5%3D56%26utm_campaign%3De.mail.ru%26utm_medium%3Dnew_portal_navigation%26utm_source%3Dportal%26x-login-auth%3D1&dwhsplit=s10273.b1ss12743s&from=login';
  await page.goto(regLink);

  const localStorage = fs.readFileSync('mailru-localStorage.json', 'utf8');
  const deserializedStorage = JSON.parse(localStorage);
  await page.evaluate(deserializedStorage => {
    for (const key in deserializedStorage) {
        localStorage.setItem(key, deserializedStorage[key]);
    }
  }, deserializedStorage);

  const data = {
    name: getRandomElement(names.split(' ')),
    surname: getRandomElement(surnames.split(' ')),
    mailboxName: getRandomString(16, {numbers: false}),
    password: getRandomString(16, {numbers: true}),
    backupMailBox: `${getRandomString(10, {numbers: false})}@gmail.com`
  }
  const timeBetweenActions = 2 * 1000;
  await page.type('[name=fname]', data.name);
  await page.type('[name=lname]', data.surname);
  for (const i of ['day', 'month', 'year']){
    (await page.$(`[data-test-id=birth-date__${i}]`)).click();
    await page.waitForTimeout(timeBetweenActions);
    const opt = await page.$$('.Select__option');
    getRandomElement((i == 'year') ? opt.slice(19, 40) : opt).click();
    await page.waitForTimeout(timeBetweenActions);
  }
  (await page.$$('[name="gender"]'))[0].click();
  await page.waitForTimeout(timeBetweenActions);
  await page.type('[name="username"]', data.mailboxName);
  await page.waitForTimeout(timeBetweenActions);
  await page.type('[name="password"]', data.password);
  await page.waitForTimeout(timeBetweenActions);
  await page.type('[name="repeatPassword"]', data.password);
  await page.waitForTimeout(timeBetweenActions);
  if (!((await page.$$('[name="email"]')).length)){
    await page.click('[data-test-id="phone-number-switch-link"]');
    await page.waitForTimeout(timeBetweenActions * 0.5);
  }
  await page.type('[name="email"]', data.backupMailBox);
  await page.waitForTimeout(timeBetweenActions);
  (await page.$$('[data-test-id="first-step-submit"]'))[1].click();
  await page.waitForTimeout(timeBetweenActions * 3);
  await (await page.$('[data-test-id="captcha-image"]')).screenshot({ path:'./captcha.jpg' });
  const base64 = Buffer.from(fs.readFileSync('./captcha.jpg')).toString('base64');

  const result = await fetch('http://185.251.91.215:3798/', { 
      method: 'POST',
      body: JSON.stringify({
          key: 'cZ1C80RNiPIKOaCYkd5miXWwCEahjiHhQ4VsklLAqZdiroJfnIuys915vfz3Ybnf',
          base64
      }),
      headers: { 'Content-Type': 'application/json' } 
  }).then(response => response.json());
  await page.waitForTimeout(timeBetweenActions);
  await page.type('[data-test-id="captcha"]', result.result);
  await page.waitForTimeout(timeBetweenActions);
  await page.click('[data-test-id="verification-next-button"]');
  await page.waitForNavigation();
  await page.waitForTimeout(timeBetweenActions);
  if ((await page.$$('svg')).length > 30){
    console.log({log: data.mailboxName, pass: data.password});
  } else {
    console.log(null);
  }
}

function getRandomString(length, options) {
  let result = '';
  const characters = options.numbers ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' 
  : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function getRandomElement(items){
  return items[Math.floor(Math.random()*items.length)];
}
