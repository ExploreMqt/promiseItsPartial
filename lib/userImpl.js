(function(){
	'use strict'
	var _ = require('lodash')

	var defaults = {
		elasticSearchProfiles: require('../elasticsearch/search').searchProfiles
	}

	module.exports = getUsers

	// Supports parameters as follows:
	//	text=<string>
	//	scope=[all | followers]  [default=all]
	//	id=<userID>
	//	pagesize=<maximum number of hits to return>  [default=10]
	//	pagenum=<number>  [default = 0]
	// Returns:
	//	{"hits" : {
	//		"total":"nnn",
	//		"users":{
	//			"<userID>":{ "name":"<string>","userHandle":"<string>" },
	//			…
	//			}
	//		}
	//	}
	function getUsers(req, res, next, options) {
		var params = req.query,
			text = params.text,
			scope = params.scope === 'followers' ? 'followers' : 'all',
			userID = params.id,
			pageSize = params.pageSize ? Number.parseInt(params.pageSize) : '10',
			pageNum = params.pageNum? Number.parseInt(params.pageNum) : '0',
			result = {}
		var behavior = _.extend({}, defaults, options)

		// Validate the params
		var error = paramsAreValid(text, scope, userID, pageSize, pageNum)
		if (undefined === error) {
			// Perform the search
			behavior.elasticSearchProfiles(text)
			// stubSearchResults(text, scope)
			.then( function(rawResults) {
				// Parse the raw search results
				result.hits = parseSearchResults(rawResults)

				// Return the results
				res.write(JSON.stringify(result))
				res.end()
			})
		} else {
			res.status(422).send(error)
		}
	}

	//-------------------------------------
	function paramsAreValid(text, scope, userID, pageSize, pageNum) {
		var err

		if (undefined === text || text.length < 1) {
			err = 'text parameter empty'
		} else if (scope === 'followers' && undefined === userID) {
			err = 'id required for scope followers'
		} else if (isNaN(pageSize) || 1 > pageSize) {
			err = 'pageSize must be a number > 0'
		} else if (isNaN(pageNum) || 0 > pageNum) {
			errr = 'pageNum must be a number >= 0'
		}

		return err
	}

	//-------------------------------------
	function parseSearchResults(rawData) {
		var result = {},
			user = {},
			users = [],
			userReturn = {}

		if (rawData.hasOwnProperty('hits')) {
			var metaData = rawData.hits

			// Pass along the number of results found
			result.total = metaData.total

			// Format the user data
			if (metaData.hasOwnProperty('hits')) {
				var usersFound = metaData.hits
				for (var key in usersFound) {
					if (usersFound.hasOwnProperty(key)) {
						var userFound = usersFound[key]
						var userID = userFound._id
						var userData = userFound._source
						if (userData !== undefined) {
							userReturn = {}
							user = {}
							userReturn.name = userData.name
							userReturn.userHandle = userData.userHandle
							user[userID] = userReturn
							users.push(user)
						}
					}
				}
				result.users = users
			}
		}

		return result
	}

}())