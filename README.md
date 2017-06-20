# blueprint2schema
Build a JSON Schema tree from an API Blueprint spec file. The tree is similar to a subset of an [OpenAPI](https://github.com/OAI/OpenAPI-Specification) spec file. The `include` directive of [Aglio](https://github.com/danielgtaylor/aglio) is supported.

Note that the underlying [API Blueprint parser](https://github.com/apiaryio/snowcrash) doesn't support indentation with tabs. This tool supports conversion from tabs to spaces (Linux and OSX only using `expand`) before the parsing phase.

# Installation
`npm install -g blueprint2schema`

# Usage

Given the following API Blueprint file called `cat.apib`

```
FORMAT: 1A

## Cat [/cat]

### Create cat [POST]
Post a cat.

+ Request (application/json)

    + Attributes (Cat)

+ Response 201 (application/json)

    + Attributes (Cat)
        + id: 1 (number, required)

# Data Structures

## Cat

+ name: Catty (string, required)
```

the following will be ouputted to `stdout`:

```shell
$ blueprint2schema -i cat.apib -p
{
  "/cat": {
    "post": {
      "body": {
        "schema": {
          "$schema": "http://json-schema.org/draft-04/schema#",
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            }
          },
          "required": [
            "name"
          ]
        }
      },
      "responses": {
        "201": {
          "body": {
            "schema": {
              "$schema": "http://json-schema.org/draft-04/schema#",
              "type": "object",
              "properties": {
                "name": {
                  "type": "string"
                },
                "id": {
                  "type": "number"
                }
              },
              "required": [
                "name",
                "id"
              ]
            }
          }
        }
      }
    }
  }
}
```

If option `-i` is not given, the input file is read from `stdin`.


## Options

```shell
$ blueprint2schema -h

  Usage: blueprint2schema [options]

  Options:

    -h, --help              output usage information
    -i, --input [filepath]  API Blueprint file
    -t, --expand-tabs       Expand tabs to spaces (Linux and OSX only)
    -p, --pretty-print      Enable pretty printing
    --requests-only         Include schemas only for requests
```

# License

MIT
