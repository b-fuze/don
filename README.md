# Don — A YAML and Make inspired build tool

Example Don:
```yaml
assets:
  - rollup
  - node-sass -r
    src/css 
    --output assets/css

lint:
  - eslint

done:
  - echo "Finished"

all:
  - $lint
  - $assets $done
```

Some things to keep in mind:
 - A target's command _must_ be indented with at least 2 spaces
 - A multi-line command's following lines must be indented at least
   2 spaces after the indentation of the command's first line (as 
   seen by `assets` second command)
 - You can't have circular target dependencies
 - You can't reference undefined targets as dependencies
 - You can't mix dependencies and normal commands on a line

## CLI Usage
```
node don.js file
```

## API Usage
```javascript
const { parse } = require("@b-fuze/don")
const targets = parse(`
assets:
  - rollup
  - node-sass -r
    src/css 
    --output assets/css

lint:
  - eslint

all:
  - $lint
  - $assets
`)
```

## Development
Download dependencies to develop Don
```
npm i
```

Rebuild Don's parser with
```
npm run build
```


