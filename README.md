# team-picker

Example dockerfile:

```
version: '2'
services:
    team-picker:
        image: xethlyx/team-picker
        restart: unless-stopped
        ports:
          - 3000:3000
```

An example is live at [https://team.xethlyx.com](https://team.xethlyx.com)
