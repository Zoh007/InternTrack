"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/waitlist/route";
exports.ids = ["app/api/waitlist/route"];
exports.modules = {

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("stream");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("zlib");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fwaitlist%2Froute&page=%2Fapi%2Fwaitlist%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fwaitlist%2Froute.ts&appDir=%2FUsers%2Fzohair007%2FDesktop%2FGithub%2FInternTrack%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fzohair007%2FDesktop%2FGithub%2FInternTrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!**************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fwaitlist%2Froute&page=%2Fapi%2Fwaitlist%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fwaitlist%2Froute.ts&appDir=%2FUsers%2Fzohair007%2FDesktop%2FGithub%2FInternTrack%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fzohair007%2FDesktop%2FGithub%2FInternTrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \**************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   originalPathname: () => (/* binding */ originalPathname),\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   requestAsyncStorage: () => (/* binding */ requestAsyncStorage),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   staticGenerationAsyncStorage: () => (/* binding */ staticGenerationAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/future/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/future/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/future/route-kind */ \"(rsc)/./node_modules/next/dist/server/future/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_zohair007_Desktop_Github_InternTrack_app_api_waitlist_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/waitlist/route.ts */ \"(rsc)/./app/api/waitlist/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_future_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_future_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/waitlist/route\",\n        pathname: \"/api/waitlist\",\n        filename: \"route\",\n        bundlePath: \"app/api/waitlist/route\"\n    },\n    resolvedPagePath: \"/Users/zohair007/Desktop/Github/InternTrack/app/api/waitlist/route.ts\",\n    nextConfigOutput,\n    userland: _Users_zohair007_Desktop_Github_InternTrack_app_api_waitlist_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { requestAsyncStorage, staticGenerationAsyncStorage, serverHooks } = routeModule;\nconst originalPathname = \"/api/waitlist/route\";\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        serverHooks,\n        staticGenerationAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIuanM/bmFtZT1hcHAlMkZhcGklMkZ3YWl0bGlzdCUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGd2FpdGxpc3QlMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZ3YWl0bGlzdCUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRnpvaGFpcjAwNyUyRkRlc2t0b3AlMkZHaXRodWIlMkZJbnRlcm5UcmFjayUyRmFwcCZwYWdlRXh0ZW5zaW9ucz10c3gmcGFnZUV4dGVuc2lvbnM9dHMmcGFnZUV4dGVuc2lvbnM9anN4JnBhZ2VFeHRlbnNpb25zPWpzJnJvb3REaXI9JTJGVXNlcnMlMkZ6b2hhaXIwMDclMkZEZXNrdG9wJTJGR2l0aHViJTJGSW50ZXJuVHJhY2smaXNEZXY9dHJ1ZSZ0c2NvbmZpZ1BhdGg9dHNjb25maWcuanNvbiZiYXNlUGF0aD0mYXNzZXRQcmVmaXg9Jm5leHRDb25maWdPdXRwdXQ9JnByZWZlcnJlZFJlZ2lvbj0mbWlkZGxld2FyZUNvbmZpZz1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7OztBQUFzRztBQUN2QztBQUNjO0FBQ3FCO0FBQ2xHO0FBQ0E7QUFDQTtBQUNBLHdCQUF3QixnSEFBbUI7QUFDM0M7QUFDQSxjQUFjLHlFQUFTO0FBQ3ZCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxZQUFZO0FBQ1osQ0FBQztBQUNEO0FBQ0E7QUFDQTtBQUNBLFFBQVEsaUVBQWlFO0FBQ3pFO0FBQ0E7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDdUg7O0FBRXZIIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vaW50ZXJudHJhY2svP2JmNjAiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1tb2R1bGVzL2FwcC1yb3V0ZS9tb2R1bGUuY29tcGlsZWRcIjtcbmltcG9ydCB7IFJvdXRlS2luZCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2Z1dHVyZS9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL3pvaGFpcjAwNy9EZXNrdG9wL0dpdGh1Yi9JbnRlcm5UcmFjay9hcHAvYXBpL3dhaXRsaXN0L3JvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS93YWl0bGlzdC9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL3dhaXRsaXN0XCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS93YWl0bGlzdC9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy96b2hhaXIwMDcvRGVza3RvcC9HaXRodWIvSW50ZXJuVHJhY2svYXBwL2FwaS93YWl0bGlzdC9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHJlcXVlc3RBc3luY1N0b3JhZ2UsIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmNvbnN0IG9yaWdpbmFsUGF0aG5hbWUgPSBcIi9hcGkvd2FpdGxpc3Qvcm91dGVcIjtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgc2VydmVySG9va3MsXG4gICAgICAgIHN0YXRpY0dlbmVyYXRpb25Bc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCByZXF1ZXN0QXN5bmNTdG9yYWdlLCBzdGF0aWNHZW5lcmF0aW9uQXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgb3JpZ2luYWxQYXRobmFtZSwgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fwaitlist%2Froute&page=%2Fapi%2Fwaitlist%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fwaitlist%2Froute.ts&appDir=%2FUsers%2Fzohair007%2FDesktop%2FGithub%2FInternTrack%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fzohair007%2FDesktop%2FGithub%2FInternTrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./app/api/waitlist/route.ts":
/*!***********************************!*\
  !*** ./app/api/waitlist/route.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _lib_supabaseServer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../../lib/supabaseServer */ \"(rsc)/./lib/supabaseServer.ts\");\n\n\nasync function POST(request) {\n    try {\n        const body = await request.json().catch(()=>null);\n        const email = body?.email?.toString().trim();\n        if (!email) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Email is required\"\n            }, {\n                status: 400\n            });\n        }\n        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n        if (!emailRegex.test(email)) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Invalid email\"\n            }, {\n                status: 400\n            });\n        }\n        const supabase = (0,_lib_supabaseServer__WEBPACK_IMPORTED_MODULE_1__.getSupabaseServerClient)();\n        const { error: dbError } = await supabase.from(\"waitlist_signups\").upsert({\n            email\n        }, {\n            onConflict: \"email\"\n        });\n        if (dbError) {\n            console.error(\"[waitlist] insert failed\", dbError);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Database error\"\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            ok: true\n        });\n    } catch (err) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Unexpected error\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL3dhaXRsaXN0L3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUEyQztBQUMyQjtBQUUvRCxlQUFlRSxLQUFLQyxPQUFnQjtJQUN6QyxJQUFJO1FBQ0YsTUFBTUMsT0FBTyxNQUFNRCxRQUFRRSxJQUFJLEdBQUdDLEtBQUssQ0FBQyxJQUFNO1FBQzlDLE1BQU1DLFFBQTRCSCxNQUFNRyxPQUFPQyxXQUFXQztRQUUxRCxJQUFJLENBQUNGLE9BQU87WUFDVixPQUFPUCxxREFBWUEsQ0FBQ0ssSUFBSSxDQUFDO2dCQUFFSyxPQUFPO1lBQW9CLEdBQUc7Z0JBQUVDLFFBQVE7WUFBSTtRQUN6RTtRQUVBLE1BQU1DLGFBQWE7UUFDbkIsSUFBSSxDQUFDQSxXQUFXQyxJQUFJLENBQUNOLFFBQVE7WUFDM0IsT0FBT1AscURBQVlBLENBQUNLLElBQUksQ0FBQztnQkFBRUssT0FBTztZQUFnQixHQUFHO2dCQUFFQyxRQUFRO1lBQUk7UUFDckU7UUFFQSxNQUFNRyxXQUFXYiw0RUFBdUJBO1FBQ3hDLE1BQU0sRUFBRVMsT0FBT0ssT0FBTyxFQUFFLEdBQUcsTUFBTUQsU0FDOUJFLElBQUksQ0FBQyxvQkFDTEMsTUFBTSxDQUFDO1lBQUVWO1FBQU0sR0FBRztZQUFFVyxZQUFZO1FBQVE7UUFFM0MsSUFBSUgsU0FBUztZQUNYSSxRQUFRVCxLQUFLLENBQUMsNEJBQTRCSztZQUMxQyxPQUFPZixxREFBWUEsQ0FBQ0ssSUFBSSxDQUFDO2dCQUFFSyxPQUFPO1lBQWlCLEdBQUc7Z0JBQUVDLFFBQVE7WUFBSTtRQUN0RTtRQUVBLE9BQU9YLHFEQUFZQSxDQUFDSyxJQUFJLENBQUM7WUFBRWUsSUFBSTtRQUFLO0lBQ3RDLEVBQUUsT0FBT0MsS0FBSztRQUNaLE9BQU9yQixxREFBWUEsQ0FBQ0ssSUFBSSxDQUFDO1lBQUVLLE9BQU87UUFBbUIsR0FBRztZQUFFQyxRQUFRO1FBQUk7SUFDeEU7QUFDRiIsInNvdXJjZXMiOlsid2VicGFjazovL2ludGVybnRyYWNrLy4vYXBwL2FwaS93YWl0bGlzdC9yb3V0ZS50cz8yYzU0Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiO1xuaW1wb3J0IHsgZ2V0U3VwYWJhc2VTZXJ2ZXJDbGllbnQgfSBmcm9tIFwiLi4vLi4vLi4vbGliL3N1cGFiYXNlU2VydmVyXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcXVlc3Q6IFJlcXVlc3QpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBib2R5ID0gYXdhaXQgcmVxdWVzdC5qc29uKCkuY2F0Y2goKCkgPT4gbnVsbCk7XG4gICAgY29uc3QgZW1haWw6IHN0cmluZyB8IHVuZGVmaW5lZCA9IGJvZHk/LmVtYWlsPy50b1N0cmluZygpLnRyaW0oKTtcblxuICAgIGlmICghZW1haWwpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIkVtYWlsIGlzIHJlcXVpcmVkXCIgfSwgeyBzdGF0dXM6IDQwMCB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBlbWFpbFJlZ2V4ID0gL15bXlxcc0BdK0BbXlxcc0BdK1xcLlteXFxzQF0rJC87XG4gICAgaWYgKCFlbWFpbFJlZ2V4LnRlc3QoZW1haWwpKSB7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogXCJJbnZhbGlkIGVtYWlsXCIgfSwgeyBzdGF0dXM6IDQwMCB9KTtcbiAgICB9XG5cbiAgICBjb25zdCBzdXBhYmFzZSA9IGdldFN1cGFiYXNlU2VydmVyQ2xpZW50KCk7XG4gICAgY29uc3QgeyBlcnJvcjogZGJFcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKFwid2FpdGxpc3Rfc2lnbnVwc1wiKVxuICAgICAgLnVwc2VydCh7IGVtYWlsIH0sIHsgb25Db25mbGljdDogXCJlbWFpbFwiIH0pO1xuXG4gICAgaWYgKGRiRXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJbd2FpdGxpc3RdIGluc2VydCBmYWlsZWRcIiwgZGJFcnJvcik7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogXCJEYXRhYmFzZSBlcnJvclwiIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgb2s6IHRydWUgfSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIlVuZXhwZWN0ZWQgZXJyb3JcIiB9LCB7IHN0YXR1czogNTAwIH0pO1xuICB9XG59XG5cblxuIl0sIm5hbWVzIjpbIk5leHRSZXNwb25zZSIsImdldFN1cGFiYXNlU2VydmVyQ2xpZW50IiwiUE9TVCIsInJlcXVlc3QiLCJib2R5IiwianNvbiIsImNhdGNoIiwiZW1haWwiLCJ0b1N0cmluZyIsInRyaW0iLCJlcnJvciIsInN0YXR1cyIsImVtYWlsUmVnZXgiLCJ0ZXN0Iiwic3VwYWJhc2UiLCJkYkVycm9yIiwiZnJvbSIsInVwc2VydCIsIm9uQ29uZmxpY3QiLCJjb25zb2xlIiwib2siLCJlcnIiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/waitlist/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/supabaseServer.ts":
/*!*******************************!*\
  !*** ./lib/supabaseServer.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   getSupabaseServerClient: () => (/* binding */ getSupabaseServerClient)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/module/index.js\");\n\nfunction getSupabaseServerClient() {\n    const url = \"https://fshfthcypfxkmxnsbelz.supabase.co\";\n    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;\n    const anonKey = \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzaGZ0aGN5cGZ4a214bnNiZWx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4NTE4MjAsImV4cCI6MjA3NzQyNzgyMH0.-22CV_zrhKEmbInA-MS4K_rTMO_aHZ-yNe2T1f5vp_4\";\n    if (!url) {\n        throw new Error(\"Supabase env var missing: set NEXT_PUBLIC_SUPABASE_URL\");\n    }\n    const key = serviceRoleKey || anonKey;\n    if (!key) {\n        throw new Error(\"Supabase key missing: set SUPABASE_SERVICE_ROLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY\");\n    }\n    return (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(url, key, {\n        auth: {\n            persistSession: false\n        }\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc3VwYWJhc2VTZXJ2ZXIudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBcUQ7QUFFOUMsU0FBU0M7SUFDZCxNQUFNQyxNQUFNQywwQ0FBb0M7SUFDaEQsTUFBTUcsaUJBQWlCSCxRQUFRQyxHQUFHLENBQUNHLHlCQUF5QjtJQUM1RCxNQUFNQyxVQUFVTCxrTkFBeUM7SUFFekQsSUFBSSxDQUFDRCxLQUFLO1FBQ1IsTUFBTSxJQUFJUSxNQUFNO0lBQ2xCO0lBRUEsTUFBTUMsTUFBTUwsa0JBQWtCRTtJQUM5QixJQUFJLENBQUNHLEtBQUs7UUFDUixNQUFNLElBQUlELE1BQ1I7SUFFSjtJQUVBLE9BQU9WLG1FQUFZQSxDQUFDRSxLQUFLUyxLQUFLO1FBQzVCQyxNQUFNO1lBQUVDLGdCQUFnQjtRQUFNO0lBQ2hDO0FBQ0YiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9pbnRlcm50cmFjay8uL2xpYi9zdXBhYmFzZVNlcnZlci50cz9jNzhjIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN1cGFiYXNlU2VydmVyQ2xpZW50KCkge1xuICBjb25zdCB1cmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkw7XG4gIGNvbnN0IHNlcnZpY2VSb2xlS2V5ID0gcHJvY2Vzcy5lbnYuU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWTtcbiAgY29uc3QgYW5vbktleSA9IHByb2Nlc3MuZW52Lk5FWFRfUFVCTElDX1NVUEFCQVNFX0FOT05fS0VZO1xuXG4gIGlmICghdXJsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiU3VwYWJhc2UgZW52IHZhciBtaXNzaW5nOiBzZXQgTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMXCIpO1xuICB9XG5cbiAgY29uc3Qga2V5ID0gc2VydmljZVJvbGVLZXkgfHwgYW5vbktleTtcbiAgaWYgKCFrZXkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICBcIlN1cGFiYXNlIGtleSBtaXNzaW5nOiBzZXQgU1VQQUJBU0VfU0VSVklDRV9ST0xFX0tFWSAocHJlZmVycmVkKSBvciBORVhUX1BVQkxJQ19TVVBBQkFTRV9BTk9OX0tFWVwiXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBjcmVhdGVDbGllbnQodXJsLCBrZXksIHtcbiAgICBhdXRoOiB7IHBlcnNpc3RTZXNzaW9uOiBmYWxzZSB9LFxuICB9KTtcbn1cblxuXG4iXSwibmFtZXMiOlsiY3JlYXRlQ2xpZW50IiwiZ2V0U3VwYWJhc2VTZXJ2ZXJDbGllbnQiLCJ1cmwiLCJwcm9jZXNzIiwiZW52IiwiTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMIiwic2VydmljZVJvbGVLZXkiLCJTVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZIiwiYW5vbktleSIsIk5FWFRfUFVCTElDX1NVUEFCQVNFX0FOT05fS0VZIiwiRXJyb3IiLCJrZXkiLCJhdXRoIiwicGVyc2lzdFNlc3Npb24iXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./lib/supabaseServer.ts\n");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/whatwg-url","vendor-chunks/tr46","vendor-chunks/tslib","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader.js?name=app%2Fapi%2Fwaitlist%2Froute&page=%2Fapi%2Fwaitlist%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fwaitlist%2Froute.ts&appDir=%2FUsers%2Fzohair007%2FDesktop%2FGithub%2FInternTrack%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fzohair007%2FDesktop%2FGithub%2FInternTrack&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();