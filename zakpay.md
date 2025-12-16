Jump to Content
Zaakpay
Home
Guides

Search
CTRL-K
Documentation
Getting Started with Zaakpay

Zaakpay Products

Integrate with Zaakpay

Plugins for Ecommerce platforms

Sandbox environment
Going live with Zaakpay
Zaakpay APIs
Check Transaction Status API
Update/Refund API
Split Payment API
Settlement API
Bulk Transaction API
Ledger API
Webhooks
Frequently Asked Questions
Integration FAQs
Powered by 

Webhooks
Zaakpay Push Notifications

Webhooks are server to server API Callbacks or Push Notifications triggered on specific events. Zaakpay sends the Callback of the transaction on the merchant's Webhook url.

Configuration
For Production, Zaakpay Webhooks can be configured from Zaakpay Dashboard by merchant and receive notifications when a specific event occurs.

Method Type: POST

End point: Callback URL can be configured by Merchant via Zaakpay Dashboard.

When the events triggered, Zaakpay send an HTTP POST request with two parameters txnData and checksum, both in the POST Body, in application/json format, and the realtime query parameter is the one that is solely being passed in the url on webhook URL.


Request attributes
Zaakpay POST below 2 attributes along with the realtime=true(false for non real time) as query parameter that is passed in the url.

Fields	DataType	Mandatory	Description
txnData	JSON	Y	This JSON also has 3 fields: 1.txns: Txn information. 2. merchantIdentifier: Merchant identifier. 3.refunds: All txns auto-refunded if auto-refund is enabled by merchant.
checksum	String	Y	checksum calculated on the entire JSON value of txnData using secret key of the merchant.
Use of Webhooks
For Webhooks, You receive the data when event triggered/transaction complete. If you are using Webhooks, you don't need to keep polling, you will receive the webhook on completion of transaction.

Based on the Transaction Success time Zaakpay sends Webhooks, which are classified into two categories:-

Real Time Webhook
Zaakpay will send the callback for all the transactions that got successful or declined in real time

Non Real Time Webhook
Zaakpay will send the callback for all the transactions that got updated in non-real time or after bank recon

Sometimes, the communication between the bank and Zaakpay may not take place. This could be due to any issue at bank's end while the processing the transaction.
Zaakpay retry to get the response from Bank, when we didn't get any response, we marked that transaction as Failed at Zaakpay's end, but it changed to Success at a later time when bank send us the file after reconciliation.

❗️
Non Real Time Webhooks
When there are more than 10 transactions which have been updated in bank reconciliation, there will be multiple POST requests. Currently there can be maximum 10 transactions in one POST request/Call.

For Example, if there are total of 26 transactions that have been updated on a day, Zaakpay will make 3 POST requests to merchant’s push notification url. First 2 requests will have 10 transactions each in JSON and the 3rd request will have 6 transactions.

Sample Request/data posted by Zaakpay
This is a sample request, Showing how Zaakpay POST data on the merchant's URL

cURL

curl --location --request POST '[WEBHOOK_URL]?realtime=true' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--data-urlencode 'txnData={"merchantIdentifier":"fb2016ffd3a64b2994a6289dc2b671a4","txns":[{"amount":"850","pgTransId":"ZP5ccbbe5d0b30b","orderId":"ZP43613736458877783333","paymentMode":"Debit Card","cardScheme":"Visa","product3Description":"NA","cardToken":"4012 XXXX XXXX 1112","responseCode":"100","bank":"HDFC","bankid":"NA","doRedirect":"false","product1Description":"NA","product4Description":"NA","responseDescription":"The transaction was completed successfully. ","cardId":"25157d8564f730461489ea3102c393fd3bf13cfed94966f44815714d57170f4c~273","cardhashid":"CH373","paymentMethod":"401200","product2Description":"NA","pgTransTime":"09\/24\/2021 16:49:40","txnDate":"2021-09-24 16:49:41.36","productDescription":"NA"}]}' \
--data-urlencode 'checksum=be47e490cd5638b7b0e263090205ef1ad705b0cbca9b14bd987193a496d0d6b9'
Real Time Webhook
Data POSTED by Zaakpay for Real Time Webhooks.

Successful Transaction
Failed Transaction

txnData={
   "merchantIdentifier":"fb2016ffd3a64b2994a6289dc2b671a4",
   "txns":[
      {
         "amount":"1000",
         "pgTransId":"ZP5ccbb5a8b4959",
         "orderId":"ZPLive1632479839916",
         "paymentMode":"Debit Card",
         "cardScheme":"Visa",
         "product3Description":"NA",
         "cardToken":"4012 XXXX XXXX 1112",
         "responseCode":"100",
         "bank":"HDFC",
         "bankid":"NA",
         "doRedirect":"false",
         "product1Description":"NA",
         "product4Description":"NA",
         "responseDescription":"The transaction was completed successfully. ",
         "cardId":"25157d8564f730461489ea3102c393fd3bf13cfed94966f44815714d57170f4c~273",
         "cardhashid":"CH373",
         "paymentMethod":"401200",
         "product2Description":"NA",
         "pgTransTime":"09\/24\/2021 16:11:06",
         "txnDate":"2021-09-24 16:11:07.272",
         "productDescription":"Zaakpay subscription fee"
      }
   ]
}&checksum=b114d127fbe793150ef7a0d10e3c084c975b48d20382bacb0080864f573dd6ea
Non Real Time Webhook
Data POSTED by Zaakpay for Non Real Time Webhooks.

JSON

txnData={
   "merchantIdentifier":"b19e8f103bce406cbd3476431b6b7973",
   "txns":[
      {
         "amount":1000,
         "orderid":"ZPLive1625124227854",
         "txnDate":"2021-07-01 12:53:55.0"
      }
   ]
}&checksum=1f2d42b7557164ec17bfda28b1efb943dc13e3a4d27aa9dd6d1d83a5fed231ef
👍
Want to Test Webhooks?
To test the real time webhook, Please get in touch with the Integration team. Drop mail along with your Webhooks URL.

Checksum Calculation
Checksum will be calculated on the entire JSON value of txnData using secret key of the merchant. For Instance, Please refer to below Checksum String and Generated Checksum.

Checksum String
Generated Checksum

{"merchantIdentifier":"fb2016ffd3a64b2994a6289dc2b671a4","txns":[{"amount":"850","pgTransId":"ZP5ccbbe5d0b30b","orderId":"ZP43613736458877783333","paymentMode":"Debit Card","cardScheme":"Visa","product3Description":"NA","cardToken":"4012 XXXX XXXX 1112","responseCode":"100","bank":"HDFC","bankid":"NA","doRedirect":"false","product1Description":"NA","product4Description":"NA","responseDescription":"The transaction was completed successfully. ","cardId":"25157d8564f730461489ea3102c393fd3bf13cfed94966f44815714d57170f4c~273","cardhashid":"CH373","paymentMethod":"401200","product2Description":"NA","pgTransTime":"09\/24\/2021 16:49:40","txnDate":"2021-09-24 16:49:41.36","productDescription":"NA"}]}
Response
In Response to the above call, Merchant should return HTTP status code 2xx and "SUCCESS" to Zaakpay.

🚧
Didn't Receive 2XX Response?
If Zaakpay does not receive this response, Zaakpay will retry above request with same data again.

Updated about 2 months ago

Ledger API
Integration FAQs
Did this page help you?
Table of Contents
Configuration
Request attributes
Use of Webhooks
Sample Request/data posted by Zaakpay
Real Time Webhook
Non Real Time Webhook
Checksum Calculation
Response




Jump to Content
Zaakpay
Home
Guides

Search
CTRL-K
Documentation
Getting Started with Zaakpay

Zaakpay Products

Integrate with Zaakpay

Plugins for Ecommerce platforms

Sandbox environment
Going live with Zaakpay
Zaakpay APIs
Check Transaction Status API
Update/Refund API
Split Payment API
Settlement API
Bulk Transaction API
Ledger API
Webhooks
Frequently Asked Questions
Integration FAQs
Powered by 

Ledger API
Download data of all your transactions for a given date

Zaakpay provides functionality to fetch and download detailed transaction data category wise in bulk for a particular date through API with pagination and authorisation.

Authorisation has to be done using API key which can be generated via Merchant Dashboard.

Ledger API
Purpose: This API is used to fetch transaction details which were performed on a particular date with authorisation and pagination.

Request URL: {HOST}/api/v1/ledger

Environment details:
Staging Server: https://zaakstaging.zaakpay.com
Live Server: https://api.zaakpay.com

Request Type: POST
Endpoint: /api/v1/ledger

Request Header
This key will be used to authorise the API request , merchant can generate API KEY from Zaakpay Dashboard.

Header Name	Value
X-API-Key	xxx39ad7bc6f4xxxb1d9010d06485xxx

Request Attributes
Fields	DataType	Mandatory	Description
startDateTime	LocalDateTime	Y	Start date time in “yyyy-MM-dd HH:mm” format
endDateTime	LocalDateTime	Y	End date time in “yyyy-MM-dd HH:mm” format
status	String	Y	Status of transactions requested. Possible Values SUCCESS, FAILED, PENDING,ALL.
pageNumber	Integer	N	Page number of paginated records (Default: 1)
pageSize	Integer	N	Number of records in a page (Default: 1000, Max: 10000)
includeDelayedSuccessTxn	Boolean	N	To include non realtime transactions set this flag as true (Default : false)
Response Attributes
Fields	Description
txnInitiatedDate	Date on which Transaction was initiated in yyyy-MM-dd HH:mm:ss format.
txnLastUpdatedDate	Date on which Transaction was Last updated in yyyy-MM-dd HH:mm:ss format.
txnSuccessDate	Date on which Transaction was successful in yyyy-MM-dd HH:mm:ss format.
status	Status of transaction i.e Success or Failure.
state	Zaakpay internal state code of transaction ID.
stateDescription	Zaakpay internal state code description.
responseCode	It is a max 3 digits Zaakpay’s Response code.
responseDescription	It is a description of Zaakpay’s Response code. E.g. Description of Response code 100 is “The transaction was completed successfully”.
orderid	Unique transaction identifier for merchant.
txnid	Zaakpay internal unique transaction ID.
amount	Transaction amount in Rupees.
brand	Brand or card network eg: MASTERCARD.
cardType	Type of Card used for transaction eg: DEBIT/CREDIT.
buyerName	As received with the request.
buyerEmail	As received with the request.
bankName	Issuing Bank name.
cardNumber	Encrypted Card Number which is used in transaction.
paymentSource	Source from where transaction done like Net Banking, Debit Card, Credit Card.
refundDetail	Refund Details object with refundReferenceNumber, createdAt and amount.
Sample Request
This is the sample API request for reference.

Request JSON

curl --location --request POST 'https://api.zaakpay.com/api/v1/ledger' \
--header 'X-API-Key: 3a6d1e46a6bd48a9bb566d2310cdd0ee' \
--header 'Content-Type: application/json' \
--data-raw '{
    "startDateTime":"2023-04-27 12:24",
    "endDateTime":"2023-04-28 00:00",
    "status":"SUCCESS",
    "pageNumber":1,
    "pageSize":1000,
    "includeDelayedSuccessTxn":true

}'
Sample Response
This is a API's sample Success and Failure response for reference.

Success JSON Response
Failure JSON Response 1
Failure JSON Response 2

{
   "success":true,
   "data":{
      "isNextPageAvailable":false,
      "transactions":[
         {
            "txnInitiatedDate":"2020-09-19 11:53:32",
            "txnLastUpdatedDate":"2020-09-19 11:53:56",
            "txnSuccessDate":"2020-09-19 11:53:56",
            "status":"SUCCESS",
            "state":7,
            "stateDescription":"Captured",
            "responseCode":100,
            "responseDescription":"The transaction was completed successfully. ",
            "orderId":"JK6461235428",
            "txnId":"ZP5afa4a80d109c",
            "amountInRupees":248.00,
            "brand":null,
            "cardType":null,
            "buyerName":"Test buyer",
            "buyerEmail":"test12@gmail.com",
            "bankName":"INSTAMOJO_NET",
            "cardNumber":null,
            "paymentSource":"Net Banking",
            "refundDetail":null
         },
         {
            "txnInitiatedDate":"2020-07-17 14:56:05",
            "txnLastUpdatedDate":"2020-07-17 15:40:36",
            "txnSuccessDate":"2020-07-17 14:56:25",
            "status":"SUCCESS",
            "state":22,
            "stateDescription":"Partial Refund Initiated",
            "responseCode":100,
            "responseDescription":"The transaction was completed successfully. ",
            "orderId":"ZPLive1594977943739",
            "txnId":"ZP5aa9fbf10caa1",
            "amountInRupees":10.00,
            "brand":"AMERICAN EXPRESS",
            "cardType":"CREDIT",
            "buyerName":"Parekh",
            "buyerEmail":"test@gmail.com",
            "bankName":"AMERICAN EXPRESS",
            "cardNumber":"3021xxxxxxxx0000",
            "paymentSource":"Card",
            "refundDetail":[
               {
                  "refundReferenceNumber":"REF5aa9fc333cb3b",
                  "createdAt":"2020-07-17 14:57:26",
                  "amount":5.00
               },
               {
                  "refundReferenceNumber":"REF5aaa05e405a8a",
                  "createdAt":"2020-07-17 15:40:44",
                  "amount":2.00
               }
            ]
         },
         {
            "txnInitiatedDate":"2021-06-01 13:17:33",
            "txnLastUpdatedDate":"2021-06-01 13:29:39",
            "txnSuccessDate":null,
            "status":"FAILED",
            "state":6,
            "stateDescription":"Declined",
            "responseCode":183,
            "responseDescription":"Unfortunately the transaction has failed.Please try again. Transaction has failed",
            "orderId":"ZPLive1622533618653",
            "txnId":"ZP5c3af8e0fe0ea",
            "amountInRupees":3.00,
            "brand":"VISA",
            "cardType":"CREDIT",
            "buyerName":"Daksh",
            "buyerEmail":"daksh@gmail.com",
            "bankName":"HDFC",
            "cardNumber":"401200xxxxxx1112",
            "paymentSource":"Card",
            "refundDetail":null
         },
         {
            "txnInitiatedDate":"2021-06-01 13:42:02",
            "txnLastUpdatedDate":"2021-06-01 13:44:00",
            "txnSuccessDate":null,
            "status":"PENDING",
            "state":2,
            "stateDescription":"Processing",
            "responseCode":null,
            "responseDescription":null,
            "orderId":"ZPLive1622535095806",
            "txnId":"ZP5c3afe5975756",
            "amountInRupees":3.00,
            "brand":"VISA",
            "cardType":"CREDIT",
            "buyerName":"Daksh",
            "buyerEmail":"daksh@gmail.com",
            "bankName":"HDFC",
            "cardNumber":"401200xxxxxx1112",
            "paymentSource":"Card",
            "refundDetail":null
         }
      ]
   }
}
Ledger API: Error Codes
These are the Ledger API Error codes. For more info, Please download the Documentation Directly from here.

Error Code	Error Description
100	API key value can not be empty.
112	X-API-KEY not correct.
1026	Start or End date fields not present in request.
1027	Status is not present in request or is invalid.
1028	Invalid date time format.
1029	Invalid pageSize or pageNumber.
1030	PageSize exceeds the limit 10000.
1031	Start date time cannot be less than end date time.
1032	Start date cannot be older than 6 months.
1033	End date cannot be greater than current date.
1034	Duration between start and end date time should be less than limit 24 hrs.
1035	No record found.
1036	Something went wrong.
🚧
Note:-
If page number is not provided in the request parameter then by default page number will be 1.
If page size is not provided in the request parameter then by default page size will be 10.
Maximum page size allowed is 500.
Date format - YYYY-MM-dd
Updated about 2 months ago

Bulk Transaction API
Webhooks
Did this page help you?
Table of Contents
Ledger API
Request Header
Request Attributes
Response Attributes
Sample Request
Sample Response
Ledger API: Error Codes




Jump to Content
Zaakpay
Home
Guides

Search
CTRL-K
Documentation
Getting Started with Zaakpay

Zaakpay Products

Integrate with Zaakpay

Plugins for Ecommerce platforms

Sandbox environment
Going live with Zaakpay
Zaakpay APIs
Check Transaction Status API
Update/Refund API
Split Payment API
Settlement API
Bulk Transaction API
Ledger API
Webhooks
Frequently Asked Questions
Integration FAQs
Powered by 

Settlement API
Introduction
Test Server: http://zaakstaging.zaakpay.com/api/v2/getSettlementReport

Live Server: https://zaakpay.com/api/v2/getSettlementReport

Request Parameters
Parameter

Optional O, Mandatory M

Validation

Allowed Values

merchantIdentifier

M

alphanumeric

utr_date

M

date of UTR

valid date

checksum

M

Checksum Calculated On All above request parameters

Response Parameters
Parameters

Description

partner_transaction_id

MobiKwik Payment Gateway txn ID

client_transaction_id

Client Transaction ID

txn_date

Date of the transaction

amount

Txn amount in paisa,Integer

settlement_date

Date of the settlement

settlement_action

Action of the settlement (Refund)

transaction_utr

UTR number for the transaction

settlement_amount

settlement Amount

arn

Reference Number

partner_service_fee

partner_service_tax

Sample Request
cURL

curl -X POST \
  https://zaakstaging.zaakpay.com/api/v2/getSettlementReport \
  -H 'Cache-Control: no-cache' \
  -H 'Content-Type: application/json' \
  -H 'Postman-Token: 147c3efd-020b-4a0c-b36d-714541bac255' \
  -d '{ "merchantIdentifier":"b19e8f103bce406cbd3476431b6b7973",
"checksum":"9bcb2f459ece11949c35aca8a52cf356c873e0d56c6d2da9e9776e2d0abd9ac4", "utr_date":"06-03-2019" }'
Request Checksum String: b19e8f103bce406cbd3476431b6b7973,06-03-2019

Calculate the checksum using the HMAC SHA-256 algorithm on the concatenated string as data and your generated secret key.
The resulting checksum calculated should be posted to the Zaakpay Payment Gateway API along with other data.
Sample Response
JSON

{ 
    "report": [ 
        { 
            "partner_transaction_id": "ZP562fa81badde4", 
            "client_transaction_id": "ZTD3D-18-14DF6D95F5F", 
            "txn_date": "2018-01-17 20:59:01", 
            "amount": "318.90", 
            "settlement_date": "2018-01-22", 
            "settlement_action": "REFUND", 
            "transaction_utr": "CMS745287157", 
            "partner_service_fee": "0.0", 
            "partner_service_tax": "0.0", 
            "settlement_amount": "318.90", 
            "rrn": "", 
            "arn": "85215228021802487698337" 
        }, 
        { 
            "partner_transaction_id": "ZP562fefd881409", 
            "client_transaction_id": "ZTD3D-18-71653171229", 
            "txn_date": "2018-01-18 02:19:58", 
            "amount": "169.58", 
            "settlement_date": "2018-01-22", 
            "settlement_action": "REFUND", 
            "transaction_utr": "CMS745287157", 
            "partner_service_fee": "0.0", 
            "partner_service_tax": "0.0", 
            "settlement_amount": "169.58", 
            "rrn": "", 
            "arn": "74766518021802480946445" 
        },
 ], 
    "responsecode": "100", 
    "responsedescription": "Successful" 
}

{ 
    "report": [ 
        { 
            "partner_transaction_id": "ZP562fa81badde4", 
            "client_transaction_id": "ZTD3D-18-14DF6D95F5F", 
            "txn_date": "2018-01-17 20:59:01", 
            "amount": "318.90", 
            "settlement_date": "2018-01-22", 
            "settlement_action": "REFUND", 
            "transaction_utr": "CMS745287157", 
            "partner_service_fee": "0.0", 
            "partner_service_tax": "0.0", 
            "settlement_amount": "318.90", 
            "rrn": "", 
            "arn": "85215228021802487698337" 
        }, 
        { 
            "partner_transaction_id": "ZP562fefd881409", 
            "client_transaction_id": "ZTD3D-18-71653171229", 
            "txn_date": "2018-01-18 02:19:58", 
            "amount": "169.58", 
            "settlement_date": "2018-01-22", 
            "settlement_action": "REFUND", 
            "transaction_utr": "CMS745287157", 
            "partner_service_fee": "0.0", 
            "partner_service_tax": "0.0", 
            "settlement_amount": "169.58", 
            "rrn": "", 
            "arn": "74766518021802480946445" 
        },
 ], 
    "responsecode": "100", 
    "responsedescription": "Successful" 
}
📘
Note
The API can be accesed twice in 1 hour. In case you have exhausted this limit
then you will to wait for the next cycle.
One day report can be generated in one hit of API.
Date format should be dd-MM-yyyy
Checksum should be calculated using secret key on parameters
“merchantIdentifier,utr_date”. Make sure the parameters are separated using
comma. No need to use “” inverted commas while calculating checksum.
Updated 6 months ago

Split Payment API
Bulk Transaction API
Did this page help you?
Table of Contents
Introduction
Request Parameters
Response Parameters
Sample Request
Sample Response



Jump to Content
Zaakpay
Home
Guides

Search
CTRL-K
Documentation
Getting Started with Zaakpay

Zaakpay Products

Integrate with Zaakpay

Plugins for Ecommerce platforms

Sandbox environment
Going live with Zaakpay
Zaakpay APIs
Check Transaction Status API
Update/Refund API
Split Payment API
Settlement API
Bulk Transaction API
Ledger API
Webhooks
Frequently Asked Questions
Integration FAQs
Powered by 

Bulk Transaction API
Download data of all your successful transactions for a given date

Introduction
Bulk Transaction API is used to fetch transaction details which were performed on a particular date with pagination and authorization. Authorization has to be done using API key which can be generated via Merchant Dashboard.

Request Type - POST
Request Url - /api/v1/fetchtxn

Request Header
Header Name	Value
X-API-Key	xxx39ad7bc6f4xxxb1d9010d06485xxx
Request Parameter
Parameters	Optional (O)/Mandatory(M)	Validation	Allowed Value
txnDate	M	Date format yyyy-MM-dd	
status	M	Status of transaction	success
pageNumber	O	Numeric	
pageSize	O	Numeric	Maximum page size allowed is 500
Response Parameter
Parameter

Description

txnInitiatedDate

Date on which Transaction was initiated in yyyy-MM-dd HH:mm:ss format

txnSuccessDate

Date on which Transaction was successful in yyyy-MM-dd HH:mm:ss format

orderid

Unique transaction identifier for merchant

txnid

Zaakpay internal unique transaction ID

amount

Transaction amount in Rupees

paymentSource

Source from where transaction done like Net Banking, Debit Card, Credit Card

brand

Brand or card network eg: MASTERCARD

cardType

Type of Card used for transaction
eg: DEBIT/CREDIT

buyerName

As received with the request

buyerEmail

As received with the request

status

Status of transaction i.e Success or Failure

approvalCode

Numeric Code provided by bank

productdescription

As received with the request

product1description

As received with the request

product2description

As received with the request

product3description

As received with the request

product4description

As received with the request

checksum

Checksum calculated by Zaakpay on all above response parameters

bankName

Issuing Bank name

cardNumber

Encrypted Card Number which is used in transaction

ipAddress

IP Address of the system from where transaction was initiated

refundDetail

Refund Details object with refundReferenceNumber, createdAt and amount

Sample Request
cURL

curl --location --request POST 'http://localhost:8080/api/v1/fetchtxn' \
--header 'checksum: 4b52cb6dfaafe30e0643d402c2f2c7a3b2107420ca722bdae8af029a20fcc150' \
--header 'X-API-Key: 13d61fb095f243089b6f1e00ad5e1df' \
--header 'Content-Type: application/json' \
--header 'Cookie: JSESSIONID=7031070B2527EE9F4F28FE42B932F164' \
--data-raw '{
"txnDate" : "2020-06-18",
"status" : "success",
"pageNumber":1,
"pageSize":500
}'
Sample Response
Success JSON Response
Failure JSON Response
No Transaction for a Particular day Response

{
  "success": true,
  "data": [
    {
      "txnInitiatedDate": "2020-06-18 11:06:21",
      "txnSuccessDate": "2020-06-18 11:06:21",
      "orderid": "ZPLive1592458553138",
      "txnid": "ZP5a8552818842c",
      "amount": 1.02,
      "paymentSource": "Card",
      "brand": "MASTERCARD",
      "cardType": "DEBIT",
      "buyerName": " ",
      "buyerEmail": null,
      "status": "Success",
      "approvalCode": 434221,
      "productDescription": "Zaakpay subscription fee",
      "productDescription1": "",
      "productDescription2": "",
      "productDescription3": "",
      "productDescription4": null,
      "bankName": "STATE BANK OF INDIA",
      "cardNumber": "559601xxxxxx8105",
      "ipAddress": "127.0.0.1",
      "refundDetail": [
        {
          "refundReferenceNumber": "REF5a8553524aeba",
          "createdAt": "2020-06-18 11:10:00",
          "amount": 1.02
        }
      ]
    },
    {
      "txnInitiatedDate": "2020-06-18 10:53:05",
      "txnSuccessDate": "2020-06-18 10:53:05",
      "orderid": "ZPLive1592500977149",
      "txnid": "ZP5a85f078523dd",
      "amount": 3.18,
      "paymentSource": "Net Banking",
      "brand": null,
      "cardType": null,
      "buyerName": "Abhshek Negi",
      "buyerEmail": null,
      "status": "Success",
      "approvalCode": 34567,
      "productDescription": "Zaakpay subscription fee",
      "productDescription1": "",
      "productDescription2": "",
      "productDescription3": "",
      "productDescription4": null,
      "bankName": "Kotak Bank",
      "cardNumber": null,
      "ipAddress": "127.0.0.1",
      "refundDetail": [
        {
          "refundReferenceNumber": "REF90d6518e13ec",
          "createdAt": "2020-06-18 11:04:17",
          "amount": 1
        }
      ]
    }
  ]
}
📘
Note:-
If page number is not provided in the request parameter then by default page number will be 1.
If page size is not provided in the request parameter then by default page size will be 10.
Maximum page size allowed is 500.
Date format - yyyy-MM-dd
This API will only return successful transactions for the date in the request. If there is any refund initiated for the transaction then details regarding refund will be present in the refund array.
Updated about 2 months ago

Settlement API
Ledger API
Did this page help you?
Table of Contents
Introduction
Request Header
Request Parameter
Response Parameter
Sample Request
Sample Response



Jump to Content
Zaakpay
Home
Guides

Search
CTRL-K
Documentation
Getting Started with Zaakpay

Zaakpay Products

Integrate with Zaakpay

Plugins for Ecommerce platforms

Sandbox environment
Going live with Zaakpay
Zaakpay APIs
Check Transaction Status API
Update/Refund API
Split Payment API
Settlement API
Bulk Transaction API
Ledger API
Webhooks
Frequently Asked Questions
Integration FAQs
Powered by 

Split Payment API
Introduction
Test Server : http:///zaakstaging.zaakpay.com/api/v1/splitTxnByAmount

Live Server : https://api.zaakpay.com/api/v1/splitTxnByAmount

Request Parameters
Parameter	Optional O, Mandatory M	Validation	Allowed Values
orderId	M	Max 20 alphanumeric, must be unique per website, we do not accept duplicate	Your unique transaction identifier
orderAmount	M	Txn amount in paisa,Integer	Order Amount
zaakMerchantIdentifier	M	alphanumeric	MobiKwik Payment Gateway unique merchant identifier for your website
merchantAmount	M	Txn amount in paisa,Integer	Merchant Amount
Response Parameters
Parameters	Description
status	Status of the transaction
errorCode	Code of the error
errorDescription	Description of the error
orderId	Max 20 alphanumeric, must be unique per website, we do not accept duplicate
Sample Request
Method : POST
Headers :

Content-Type: application/json
zaakchecksum: b1f24d257d997866d3f63375153e130a8928a924c1702ab86b20de273b501472
Request Body :
In case Custom identifier is false

JSON

{
  "orderId": "ZPLive1504855178413",
  "orderAmount": "1000",
  "masterMerchantIdentifier": {
    "zaakMerchantIdentifier": "c4010ec85c7c4a3481965b226efc99cc",
    "merchantAmount": "0"
  },
  "subMerchantIdentifiers": [
    {
      "zaakMerchantIdentifier": " 917cb4c8afdf42bebf787810a3c19220 ",
      "merchantAmount": "600"
    },
    {
      "zaakMerchantIdentifier": "MBK70225",
      "merchantAmount": "400"
    }
  ],
  "isCustomIdentifier": false
}
In case Custom identifier is true:

JSON

{
  "orderId": "ZPLive1511118413",
  "orderAmount": "1000",
  "masterMerchantIdentifier": {
    "merchantIdentifier": "Custom1234",
    "merchantAmount": "0"
  },
  "subMerchantIdentifiers": [
    {
      "merchantIdentifier": "Custom123",
      "merchantAmount": "600"
    },
    {
      "merchantIdentifier": "Custom1235",
      "merchantAmount": "400"
    }
  ],
  "isCustomIdentifier": true
}
Sample Response
JSON

{
  "status": "FAILURE",
  "errorCode": "180",
  "errorDescription": "Checksum received with request is not equal to what we calculated.",
  "orderId": "ZPLive1504855178413"
}
Checksum For Request
Zaakchecksum is calculated on the basis of request parameter string and secret key.
For example: Consider the below sample request (JSON format)

Text

Request Parameter String will be:
{"orderId":"ZPLive1504855178413","orderAmount":"1000","masterMerchantIdentifie
r":{ "zaakMerchantIdentifier":"c4010ec85c7c4a3481965b226efc99cc",
"merchantAmount":"0"},"subMerchantIdentifiers":[{
"zaakMerchantIdentifier":"c917cb4c8afdf42bebf787810a3c19220","merchantAm
ount":"600"},{
"zaakMerchantIdentifier":"MBK70225","merchantAmount":"400"}],"isCustomIden
tifier":false}

Secret key (of master merchant): 239de630f35343b28e5b0a14896397bf (For Test
URL only)

Use above mentioned request parameter string & secret key in hmac SHA 256 algo to
generate Zaakchecksum.

Using above parameters, you will get Zaakchecksum string as mentioned below :
b1f24d257d997866d3f63375153e130a8928a924c1702ab86b20de273b501
📘
Important Terms Used
masterMerchantIdentifier: To identify the master merchant key who is adding
the split pay request.
subMerchantIdentifiers: To identify the sub merchant keys for whom the split
will be added.
isCustomIdentifier: Flag to differentiate whether the merchant will send its
own merchant name or will use the zaakpay unique merchant identifier.
merchantIdentifier: Merchant name configured at merchant’s end which is
pre-shared with Zaakpay.
zaakMerchantIdentifier: Zaakpay unique merchant identifier. If merchant is
using this key, merchant should ask Zaakpay support for the details before
going live.
Updated about 2 months ago

Update/Refund API
Settlement API
Did this page help you?
Table of Contents
Introduction
Request Parameters
Response Parameters
Sample Request
Sample Response
Checksum For Request




Jump to Content
Zaakpay
Home
Guides

Search
CTRL-K
Documentation
Getting Started with Zaakpay

Zaakpay Products

Integrate with Zaakpay

Plugins for Ecommerce platforms

Sandbox environment
Going live with Zaakpay
Zaakpay APIs
Check Transaction Status API
Update/Refund API
Split Payment API
Settlement API
Bulk Transaction API
Ledger API
Webhooks
Frequently Asked Questions
Integration FAQs
Powered by 

Update/Refund API
Zaakpay provides functionality to update the transaction to desired state and to make full or partial refunds to customers using the Merchant Dashboard and API.

🚧
Update/Refund API: Only below kind of updates are possible.
Authorised to Cancel.
Authorised to Capture.
Capture to Refund Before Payout Initiated.
Capture to Partial Refund Before Payout Initiated.
Payout Initiated to Refund Initiated.
Payout Initiated to Partial Refund Initiated.
Payout Completed to Refund Initiated.
Payout Completed to Partial Refund Initiated.
Refund through Merchant Dashboard
You can initiate the refund of transaction using the Zaakpay Dashboard. You need to follow the steps as given below.

To initiate refunds,

Go to Zaakpay Merchant Dashboard > Click Transactions.
Search for the transaction which you want to refund and click on "full Refund" or "Partial Refund".
1277
Update-Refund API
Purpose: The purpose of this API is to update the status or to refund the transaction.

Environment details:

Staging Server: https://zaakstaging.zaakpay.com
Live Server: https://api.zaakpay.com
Request Type: POST
Endpoint: /updateTxn

Request Attributes
These are the Request Attributes of Zaakpay Update/Refund API.

Fields	DataType	Mandatory	Description
merchantIdentifier	String	Y	Zaakpay’s unique alphanumeric merchant identifier. You can get it from Zaakpay dashboard.
orderId	String	Y	It is a unique transaction identifier for merchant.
Mode	String	Y	1 digit only, numeric, Allowed value is 0.
updateDesired	String	Y	Numeric digit,values predefined by Zaakpay. E.g. 7="Captured", 8="Canceled", 14="Refunded", 22=”Partial Refund”. Note:If you request a state update to "Refunded" we will issue the full amount refund to the user.
updateReason	String	Y	Description of the reason for update. min 5, max 30 alphanumeric characters. no special characters or dashes.
Amount	String	Y - In case of Partial-Refund	Refund Amount, which needs to be refunded in case of partial refunds. In case of full refund this can be omitted. For E.g. Rs 1 is 100 paisa, Rs 777.50 is 77750 paisa.
merchantRefId	String	N	Unique refund transaction id sent by merchant.
Checksum	String	Y	Checksum Calculated on all above request parameters.
Response Attributes
These are the Response Attributes of Zaakpay Update/Refund API.

Fields	Description
merchantIdentifier	Zaakpay’s unique alphanumeric merchant identifier. You can get it from Zaakpay dashboard.
orderDetail	It is a unique transaction identifier for merchant.
responseCode	It is a max 3 digits Zaakpay’s Response code.
responseDescription	It is a description of Zaakpay’s Response code. E.g. Description of Response code 100 is “The transaction was completed successfully”.
Checksum	Checksum calculated by MobiKwik Payment Gateway on all above response parameters
merchantRefId	Unique refund transaction id sent by merchant.
Checksum Calculation
Create a concatenated string using the request parameters as given below. Checksum string will create based on the request parameters which are posted to Zaakpay in the same order as given in below string.
Now, Calculate the checksum using the HMAC SHA-256 algorithm using the string as data and your generated secret key.

Request
Checksum String
Generated Checksum

data={"merchantIdentifier":"fb2016ffd3a64b2994a6289dc2b671a4","orderDetail":{"orderId":"ZPLive1632373152375","amount":"100","productDescription":"test product"},"mode":"0","updateDesired":"14","updateReason":"test reason","merchantRefId":"TESTINGtugh3"}

Secret Key (staging) : 0678056d96914a8583fb518caf42828a
❗️
Refunds can’t be made on the Transactions at “Settled” States
You can initiate refunds only on those Transaction that are not in settled state. To check the latest status of Transaction, Use our Check Transaction Status API/Zaakpay Dashboard.

Sample Request & Response
For reference, below are the sample CURL request and Response of API . It takes all required attributes to initiate a Refund of transaction.

Sample Request
We have create a sample request of Refund API with all attributes and their values, in the order in which they’ll be sent to the API.

The resulting checksum calculated should be posted to the Zaakpay API along with other data.

Update-Refund API

curl --location --request POST 'https://zaakstaging.zaakpay.com/updateTxn' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Cookie: JSESSIONID=3253388BCF7BF29453346258402DBC3E; JSESSIONID=DCAA163F07B1059473CF320670097D62' \
--data-urlencode 'data={"merchantIdentifier":"fb2016ffd3a64b2994a6289dc2b671a4","orderDetail":{"orderId":"ZPLive1632373152375","amount":"100","productDescription":"test product"},"mode":"0","updateDesired":"14","updateReason":"test reason","merchantRefId":"TESTINGtugh3"}' \
--data-urlencode 'checksum=f70f43590249d2ef82ceb2d851109b5b61e2f35e43931eef529ffaa34243a834'
Sample Response
The Response will be in JSON Format.

Sample Response 1
Sample Response 2

{
    "merchantIdentifier": "fb2016ffd3a64b2994a6289dc2b671a4",
    "orderDetail": {
        "orderId": "ZPLive1632373152375"
    },
    "responseCode": "230",
    "responseDescription": "Transaction Refund Initiated",
    "merchantRefId": "TESTINGtugh3"
}
👍
Auto Refund
This feature will allow the Merchants to automatically refund the transactions which are getting successful in non-real time.

Please raise a ticket to our support team or Connect with Business Partner to enable the same.

Update/Refund API Response codes
These are the Update/Refund API response codes.

Response Code	Response Description	Retryable	Is Success?	Details
184	Update Desired blank.	Y	N
185	Update Desired not Valid	Y	N
186	Update Reason blank.	Y	N
187	Update Reason Not Valid.	Y	N
189	Checksum was blank.	Y	N
190	orderId either not Processed or Rejected	N	N
201	Transaction cannot be refunded.	Y	N
203	Transaction status could not be updated try again.	NA	N
229	Transaction cannot be captured.	NA	N
230	Transaction Refund Initiated	N	Y	Full Refund Success code
242	Transaction captured successfully.	NA	Y
243	Transaction canceled successfully.	NA	Y
245	Transaction Partial Refund Initiated	N	Y	Partial Refund Success code
19	Refund scheduled with bank. Please try again after some time if not refunded	N	N	Pending case . Use Check status API with merchantRefId for final confirmation on refund. When failure is recieved in check status , then retry
20	Refund already scheduled with bank. Please try again after some time if not refunded	N	N	Full Refund Pending case . Use Check status API with merchantRefId for final confirmation on refund. When failure is recieved in check status , then retry
21	Some Refunds already scheduled with bank. Please try other requests after some time	N	N	Previous Partial Refunds Pending case . Check status for existing request with old merchantRefIds. For new partial refund send new unique merchantRefId in request
843	Not enough unsettled funds available with MobiKwik.	Y	N
844	Transaction cannot be refunded from 'Settled' state. Please try again later.	Y	N
846	Transactions older than 6 months cannot be refunded.	N	N
Updated about 2 months ago

Check Transaction Status API
Split Payment API
Did this page help you?
Table of Contents
Refund through Merchant Dashboard
Update-Refund API
Request Attributes
Response Attributes
Checksum Calculation
Sample Request & Response
Sample Request
Sample Response
Update/Refund API Response codes




Jump to Content
Zaakpay
Home
Guides

Search
CTRL-K
Documentation
Getting Started with Zaakpay

Zaakpay Products

Integrate with Zaakpay

Plugins for Ecommerce platforms

Sandbox environment
Going live with Zaakpay
Zaakpay APIs
Check Transaction Status API
Update/Refund API
Split Payment API
Settlement API
Bulk Transaction API
Ledger API
Webhooks
Frequently Asked Questions
Integration FAQs
Powered by 

Check Transaction Status API
API to check status of any transaction

Zaakpay provides functionality to track transaction. Any time Merchant can check the latest status of transaction through API.

Check Status API
Purpose: The API is used to check the latest status of the transaction at any time.

Environment details:

Staging Server: https://zaakstaging.zaakpay.com
Live Server: https://api.zaakpay.com
Request Type: POST
Endpoint: /checkTxn?v=5

Request Attributes
These are the Request Attributes of Zaakpay Check Status API.

Fields	DataType	Mandatory	Description
merchant Identifier	String	Y	Zaakpay’s unique alphanumeric merchant identifier. You can get it from Zaakpay dashboard.
orderId	String	Y	It is a unique transaction identifier for which status needs to be checked.
mode	String	Y	1 digit only. i.e. “0”
refundDetail.merchantRefId	String	N	Unique refund transaction id sent by merchant in Refund API
checksum	String	Y	Checksum Calculated on all above request parameters.
Response Attributes
These are the Response Attributes of Zaakpay Check Status API.

Fields	Description
merchantIdentifier	Zaakpay’s unique alphanumeric merchant identifier. You can get it from Zaakpay dashboard.
orderid	It is a unique transaction identifier for merchant.
Response code	It is a max 3 digits Zaakpay’s Response code.
response description	It is a description of Zaakpay’s Response code. E.g. Description of Response code 100 is “The transaction was completed successfully”.
paymentmethod	Payment Method ID for Card and Net Banking transactions. For Card txns, payment Method ID starts with C and N for NetBanking. It is an alphanumeric value with max length 6.First letter is C or N, followed by 5 digits max.
cardhashid	Unique id for each card number used in transaction. For Net banking txns, value will be “NA”.
amount	Transaction amount in paisa.
paymentmode	Mode of payment
txnid	Zaakpay Transaction ID.
timestamp	Time stamp of txn.
productdescription	As received with the request.
product1description	As received with the request.
product2description	As received with the request.
product3description	As received with the request.
product4description	As received with the request.
txnStatus	This is Check API txn Status. For Success, it would be “0”.
refundDetails.amount	Refund amount with respect to merchantRefId.
refundDetails.arn	Refund reference number with respect to merchantRefId.
refundDetails.merchantRefId	Refund reference number with respect to merchantRefId.
checksum	Checksum calculated by Zaakpay on all response attributes.
Checksum Calculation
Create a string(JSON) using the request attributes as given below. Checksum string will create based on the request attributes which are posted to Zaakpay as same as given in the string below.

Now, Calculate the checksum using the HMAC SHA-256 algorithm using the string as data and your generated secret key. The resulting checksum calculated should be posted to the Zaakpay API along with other data.

The Checksum string will be:

Secret Key used: 0678056d96914a8583fb518caf42828a

Checksum String
Generated Checksum

{"merchantIdentifier":"b19e8f103bce406cbd3476431b6b7973","mode":"0","orderDetail":{"orderId":"ZPLive1602500556069"},"refundDetail":{"merchantRefId":"123456"}}
Sample Request & Response
For reference, below are the sample CURL request and Response of API . It takes all required attributes to hit the Check Status API.

Sample Request
We have created a sample request of Check Status API with all required attributes and their values, in the order in which they’ll be sent to the API.

The resulting checksum calculated should be posted to the Zaakpay API along with other required attributes.

cURL

curl --location --request POST 'https://zaakstaging.zaakpay.com/checkTxn?v=5' \
--header 'Content-Type: application/x-www-form-urlencoded' \
--header 'Cookie: JSESSIONID=A4C211B0FC1F713C69DD79521963AAD2' \
--data-urlencode 'data={"merchantIdentifier":"b19e8f103bce406cbd3476431b6b7973","mode":"0","orderDetail":{"orderId":"ZPLive1602500556069"},"refundDetail":{"merchantRefId":"123456"}}' \
--data-urlencode 'checksum=e0a8a4080fc661dbd23119309d9a45817bd01cc9264b1fde9b26a1dac7e1da50'
Sample Response
The Response will be in JSON Format.

Groovy

{
    "success": true,
    "merchantIdentifier": "b19e8f103bce406cbd3476431b6b7973",
    "orders": [
        {
            "orderDetail": {
                "orderId": "ZPLive1602500556069",
                "txnId": "ZP5b1773d1f776b",
                "amount": "200",
                "productDescription": "Zaakpay subscription fee",
                "createDate": "2020-10-12 16:32:47",
                "product1Description": "NA",
                "product2Description": "NA",
                "product3Description": "NA",
                "product4Description": "NA"
            },
            "paymentInstrument": {
                "paymentMode": "Credit Card",
                "card": {
                    "cardToken": "4012 XXXX XXXX 1112",
                    "cardId": "25157d8564f730461489ea3102c393fd3bf13cfed94966f44815714d57170f4c~273",
                    "cardScheme": "Visa",
                    "first4": "4012",
                    "last4": "1112",
                    "bank": "HDFC",
                    "cardHashId": "CH373",
                    "paymentMethod": "401200"
                }
            },
            "responseCode": "230",
            "responseDescription": "Transaction Refund Initiated",
            "refundDetails":[
              {
                "amount": "100",
                "arn": "1234567"
              }
             ],
              
            "txnDate": "2020-10-12 16:44:43",
            "txnStatus": "3",
            "userAccountDebited": true
        }
    ],
    "version": "5"
}
Check Status API txn Status
txnStatus	Description
0	Success
1	Failure
2	Pending
3	Refund
4	Partial Refund
5	Chargeback Reverted
6	Chargeback
7	Partial Chargeback Reverted
8	Partial Chargeback
Check Status API Response codes
These are the Check Status API response codes.

Response Code	Response Description	Transaction Success	Valid for refund
103	Fraud Detected	✗	✗
110	MerchantIdentifier field missing or blank	✗	✗
111	MerchantIdentifier not valid	✗	✗
129	OrderId field missing or blank	✗	✗
155	Mode field missing or blank	✗	✗
156	Mode received with request was not valid	✗	✗
180	Checksum received with request is not equal to what we calculated	✗	✗
182	Merchant Data not complete in our database	✗	✗
189	Checksum was blank.	✗	✗
190	OrderId either not processed or Rejected.	✗	✗
191	Merchant Identifier or Order Id was not valid	✗	✗
205	We could not find this transaction in our database	✗	✗
206	Transaction in Scheduled state.	✗	✗
207	Transaction in Initiated state.	✗	✗
208	Transaction in Processing state.	✗	✗
209	Transaction has been authorized.	✗	✗
210	Transaction has been put on hold.	✗	✗
211	Transaction is incomplete.	✗	✗
212	Transaction has been settled.	✓	✗
213	Transaction has been canceled.	✗	✗
223	Data Validation success.	✗	✗
228	Transaction has been captured.	✓	✓
230	Transaction Refund Initiated	✓	✗
231	Transaction Refund Completed	✓	✗
232	Transaction Payout Initiated	✓	✓
233	Transaction Payout Completed	✓	✓
234	Transaction Payout Error.	✗	✗
236	Transaction Refund Paid Out	✓	✗
237	Transaction Chargeback has been initiated	✓	✗
238	Transaction Chargeback is being processed	✓	✗
239	Transaction Chargeback has been accepted	✓	✗
240	Transaction Chargeback has been reverted	✓	✗
241	Transaction Chargeback revert is now complete	✓	✗
245	Transaction Partial Refund Initiated	✓	✓
246	Transaction Partial Chargeback has been initiated	✓	✓
247	Transaction Partial Chargeback is being processed	✓	✓
248	Transaction Partial Chargeback has been accepted	✓	✓
249	Transaction Partial Chargeback has been reverted	✓	✓
251	Transaction Partial Refund Paid out	✓	✓
252	Transaction Partial Refund Completed	✓	✓
253	Transaction Refund Before Payout Paid out	✓	✓
254	Transaction Partial Refund Before Payout Paid Out	✓	✓
255	Transaction Partial Refund Before Payout Completed	✓	✓
256	Transaction Refund Before Payout Completed	✓	✗
400	Your Bank has declined this transaction, please Retry this payment with another Card.	✗	✗
Updated about 2 months ago

Going live with Zaakpay
Update/Refund API
Did this page help you?
Table of Contents
Check Status API
Request Attributes
Response Attributes
Checksum Calculation
Sample Request & Response
Sample Request
Sample Response
Check Status API txn Status
Check Status API Response codes








Jump to Content
Zaakpay
Home
Guides

Search
CTRL-K
Documentation
Getting Started with Zaakpay

Zaakpay Products

Integrate with Zaakpay

Plugins for Ecommerce platforms

Sandbox environment
Going live with Zaakpay
Zaakpay APIs
Check Transaction Status API
Update/Refund API
Split Payment API
Settlement API
Bulk Transaction API
Ledger API
Webhooks
Frequently Asked Questions
Integration FAQs
Powered by 

Going live with Zaakpay
Start collecting real payments from your customers on production environment of Zaakpay.

If you have signed up, completed the sandbox integration, you're now ready for performing real transactions on the production environment.

Generate Merchant identifier and Secret Key
For production transactions, you need to get your production merchant identifier and secret key. Click here and Proceed with the following steps to generate these credentials.

Login to the Zaakpay Dashboard.
Click on the "DEVELOPERS" Section.
Click on "Configurations".
Go under the API keys" section.
Click on "Generate key" for generating Merchant ID and Secret key.
1855
📘
Important
Please keep your Merchant Identifier and Secret Key safely and do not share or expose them to external entities.

Mandatory URL Configuration
Login to the Zaakpay Dashboard.
Click on the "DEVELOPERS" Section.
Click on "Configurations".
Click on the "Integration Urls" section and provide your website's domain name and return URL
1846
Update Transaction Limits
Login to the Zaakpay Dashboard.
Click on the "DEVELOPERS" Section.
Click on "Configurations".
Click on the "Transaction limits" section and provide your transaction limits.
1846
Generate Encryption Key Id and RSA Key for encryption
You can get your Encryption Key Id and public Key for encryption by following below steps:

Login to the Zaakpay dashboard.
Go to Developers Tab.
Click on 'Configurations'.
Click on 'API key' under that section you'll find Encryption keys.
📘
Important
Please ensure that you store your Encryption key and Public key safely and do not share them publicly or expose them in non-production environment.

Below are the videos demonstrating how transaction and settlement works in the new dashboard.
1. Transactions.



2. Settlement



Updated about 2 months ago

Sandbox environment
Check Transaction Status API
Did this page help you?
Table of Contents
Generate Merchant identifier and Secret Key
Mandatory URL Configuration
Update Transaction Limits
Generate Encryption Key Id and RSA Key for encryption
Below are the videos demonstrating how transaction and settlement works in the new dashboard.



