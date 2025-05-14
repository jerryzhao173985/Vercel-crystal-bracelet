# Curl Commands to api/astro endpoint

Below are the curl commands that successfully invoked the `/api/astro` endpoint. You can copy and reuse these examples by setting the `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`, and newly added "file, fileURL, helpers" input arguments/variables.

---

## 0. Default minimal example

```bash
curl -X POST https://crystal-bracelet-customization.vercel.app/api/astro \
  -H 'Content-Type: application/json' \
  -d '{
    "dob":"1990-05-15",
    "birthTime":"08:30",
    "gender":"female",
    "deepseekKey":"'"$DEEPSEEK_API_KEY"'",
    "openaiKey":"'"$OPENAI_API_KEY"'",
    "customPrompt":"Just Repeat the following input I gave you straightly afterwards back to me without doing anything else please:\n{dob} {birthTime} {gender}\n性别：{{ gender === '\''male'\'' ? '\''男'\'' : '\''女'\'' }}"
  }'
```

Output:

```bash
{"analysis":"1990-05-15 08:30 female\n性别：女","ratios":{"current":{"metal":25,"wood":20,"water":30,"fire":15,"earth":10},"goal":{"metal":20,"wood":20,"water":20,"fire":20,"earth":20},"colors":{"metal":"#C0C0C0","wood":"#228B22","water":"#1E90FF","fire":"#FF4500","earth":"#DEB887"}}}
```

## 1. Custom prompt with built-in function `dayOfWeek`

```bash
curl -X POST https://crystal-bracelet-customization.vercel.app/api/astro \
  -H 'Content-Type: application/json' \
  -d '{
    "dob":"1990-05-15",
    "birthTime":"08:30",
    "gender":"female",
    "deepseekKey":"'$DEEPSEEK_API_KEY'",
    "openaiKey":"'$OPENAI_API_KEY'",
    "helpers": {
      "age":"(dob)=> new Date().getFullYear()-new Date(dob).getFullYear()"
    },
    "customPrompt":"Repeat to me what I gave you now:\n生日：{dob}，年龄：{{ age(dob) }}，星期：{{ dayOfWeek(dob) }}"
  }'
```

## 2. Custom prompt with online helpers function passed in

```bash
curl -X POST https://crystal-bracelet-customization.vercel.app/api/astro \
  -H 'Content-Type: application/json' \
  -d '{
    "dob":"1990-05-15",
    "birthTime":"08:30",
    "gender":"female",
    "deepseekKey":"'$DEEPSEEK_API_KEY'",
    "openaiKey":"'$OPENAI_API_KEY'",
    "helpers": {
      "age":"(dob)=>new Date().getFullYear()-new Date(dob).getFullYear()"
    },
    "customPrompt":"Repeat info:\n生日：{dob}，年龄：{{ age(dob) - 20 }}，星期：{{ dayOfWeek(dob) }}"
  }'
```

## 3. External JS helpers via `fileURL` (lifeInWeeks.js) -- function 'undefined' as it has no return

```bash
curl -X POST https://crystal-bracelet-customization.vercel.app/api/astro \
  -H 'Content-Type: application/json' \
  -d '{
    "dob":"1999-04-06",
    "birthTime":"07:00",
    "gender":"male",
    "deepseekKey":"'$DEEPSEEK_API_KEY'",
    "openaiKey":"'$OPENAI_API_KEY'",
    "fileURL":"https://gist.githubusercontent.com/e6on/6ca5e698c1752cdab05e31012e76b3d1/raw/9d80eb736d4a98f3d82e288b074dc8fbd1cbd36c/lifeInWeeks.js",
    "helpers":{
      "age":"(dob)=>new Date().getFullYear()-new Date(dob).getFullYear()",
      "lifeString":"(age)=> {let y=90-age; return `You have ${y*365} days, ${y*52} weeks, ${y*12} months left.`}"
    },
    "customPrompt":"Just Repeat the following input I gave you straightly afterwards back to me without doing anything else please:{{ lifeString(age(dob)) }}；原 lifeInWeeks 返回：{{ lifeInWeeks(age(dob)) }}"
  }'
```

## 4. External JS helpers via `fileURL` (delta-date-fns.js) -- using fileURL from gist to load functions

```bash
curl -X POST https://crystal-bracelet-customization.vercel.app/api/astro \
  -H 'Content-Type: application/json' \
  -d '{
    "dob":"1990-05-15",
    "birthTime":"08:30",
    "gender":"female",
    "deepseekKey":"'$DEEPSEEK_API_KEY'",
    "openaiKey":"'$OPENAI_API_KEY'",
    "fileURL":"https://gist.githubusercontent.com/scsskid/94d507ab55b1606afc108ada36daa8eb/raw/28823461c93384d53293d638ddcd5fffe2473a75/delta-date-fns.js",
    "helpers":{
      "age":"(dob)=>new Date().getFullYear()-new Date(dob).getFullYear()",
      "toISO":"(d)=> (d instanceof Date? d.toISOString().slice(0,10): d)"
    },
    "customPrompt":"Just Repeat the following input I gave you straightly afterwards back to me without doing anything else please:\n现在年龄：{{ age(dob) }}\n+100天：{{ deltaDate(new Date(dob),100,0,0) }}\n三个月后：{{ deltaDateMomentJs(new Date(dob),3,\"months\") }}"
  }'
```

Note that here for a string "month" to be put in the closure data block of -d '{}' we need to escape the \".

output

```bash
-d '{...
    "customPrompt":"Just Repeat the following input I gave you straightly afterwards back to me without doing anything else please:\n现在年龄：{{ age(dob) }}\\n再过 100 天是：{{ deltaDate(new Date(dob),100,0,0) }}\\n三个月后 (moment-style)：{{ deltaDateMomentJs(new Date(dob),3,\"months\") }}"
  }'

{"analysis":"现在年龄：35\\n再过 100 天是：1990-05-31\\n三个月后 (moment-style)：1990-08-15","ratios":{"current":{"metal":28,"wood":17,"water":22,"
```

## 5. Multipart/form-data upload of helper file (megaHelpers.js) -- load user functions from a local file (using UX format)

```bash
curl -X POST https://crystal-bracelet-customization.vercel.app/api/astro \
 -H 'Content-Type: multipart/form-data' \
 -F dob=2000-01-01 \
 -F birthTime=11:11 \
 -F gender=male \
 -F deepseekKey=$DEEPSEEK_API_KEY \
 -F openaiKey=$OPENAI_API_KEY \
 -F file=@./examples/megaHelpers.js \
 -F customPrompt=$'Just Repeat the following input I gave you straightly afterwards back to me without doing anything else please:\n{{ greet(gender) }}\n200 的立方：{{ cube(200) }}\nBMI: {{ bmi(70,175) }}\n5! = {{ factorial(5) }}\n斐波那契(7): {{ JSON.stringify(fibSeq(7)) }}\n42+10={{ add10(42) }}\n生日 YMD：{{ ymd(dob) }}\n统计：[1,2,3] → {{ JSON.stringify(stats([1,2,3])) }}\n自增 id：{{ id() }}, {{ id() }}'
 ```

## 6. Base64-encoded helper file

Mac

```bash
export B64=$(base64 < examples/megaHelpers.js | tr -d '\n')
```

Linux

```bash
export B64=$(base64 -w0 examples/megaHelpers.js)
```

```bash
curl -X POST https://crystal-bracelet-customization.vercel.app/api/astro \
  -H 'Content-Type: application/json' \
  -d '{
    "dob":"1980-06-06",
    "birthTime":"06:06",
    "gender":"female",
    "deepseekKey":"'$DEEPSEEK_API_KEY'",
    "openaiKey":"'$OPENAI_API_KEY'",
    "file":"'$B64'",
    "customPrompt":"Just Repeat the following input I gave you straightly afterwards back to me without doing anything else please:\n{{ greet(gender) }}\n200 的立方：{{ cube(200) }}\nBMI: {{ bmi(70,175) }}\n5! = {{ factorial(5) }}\n斐波那契(7): {{ JSON.stringify(fibSeq(7)) }}\n42+10={{ add10(42) }}\n生日 YMD：{{ ymd(dob) }}\n统计：[1,2,3] → {{ JSON.stringify(stats([1,2,3])) }}\n自增 id：{{ id() }}, {{ id() }} 你好 {{ greet(gender) }}，你的 ID: {{ id() }}"
  }'
```

Output

```bash
jerry@jerrys-MacBook-Pro crystal-bracelet-customization % curl -X POST https://crystal-bracelet-customization.vercel.app/api/astro \
  -H 'Content-Type: application/json' \
  -d '{
    "dob":"1980-06-06",
    "birthTime":"06:06",
    "gender":"female",
    "deepseekKey":"'"$DEEPSEEK_API_KEY"'",
    "openaiKey":"'"$OPENAI_API_KEY"'",
    "file":"$(base64 < examples/megaHelpers.js | tr -d '\n')",
    "customPrompt":"Just Repeat the following input I gave you straightly afterwards back to me without doing anything else please:\n{{ greet(gender) }}\\n200 的立方：{{ cube(200) }}\\nBMI: {{ bmi(70,175) }}\\n5! = {{ factorial(5) }}\\n斐波那契(7): {{ JSON.stringify(fibSeq(7)) }}\\n42+10={{ add10(42) }}\\n生日 YMD：{{ ymd(dob) }}\\n统计：[1,2,3] → {{ JSON.stringify(stats([1,2,3])) }}\\n自增 id：{{ id() }}, {{ id() }} 你好 {{ greet(gender) }}，你的 ID: {{ id() }}"
  }'

{"analysis":"{{greet(gender)}}\\n200 的立方：{{cube(200)}}\\nBMI: {{bmi(70,175)}}\\n5! = {{factorial(5)}}\\n斐波那契(7): {{JSON.stringify(fibSeq(7))}}\\n42+10={{add10(42)}}\\n生日 YMD：{{ymd(dob)}}\\n统计：[1,2,3] → {{JSON.stringify(stats([1,2,3]))}}\\n自增 id：{{id()}}, {{id()}} 你好 {{greet(gender)}}，你的 ID: {{id()}}","ratios":{"current":{"metal":22,"wood":18,"water":25,"fire":15,"earth":20},"goal":{"metal":20,"wood":20,"water":20,"fire":20,"earth":20},"colors":{"metal":"#A6A6A6","wood":"#1CAC78","water":"#3993DD","fire":"#FF6F3C","earth":"#CC9A53"}}}
```
