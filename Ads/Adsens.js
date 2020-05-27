// Comma-separated list of recipients. Comment out to not send any emails.
var RECIPIENT_EMAIL = 'mapping+11162240857546+11162244167583@atlas.facebook.com, cost+11162240857546+11162244167583@atlas.facebook.com';

function main() {
  var accountSelector = MccApp.accounts();
  accountSelector.executeInParallel("processIndividualAccount");
}

function processIndividualAccount() { 
  Logger.log('Starting search report generation for account - ' + AdWordsApp.currentAccount().getCustomerId ());
  processCampaigns('search');
  processCampaigns('shopping');
}

function processCampaigns(type) {
  Logger.log('Processing ' + type + ' campaigns');

  var MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
  // Headers
  var csv = 'Date, Keyword, Campaign ID, Campaign, Ad group ID, Ad group, Impressions, Clicks, Cost, Timezone';
  var report;
  var campaign_ids_map = {};

  if (type == 'search') { 
    // Generate report
    var report = AdWordsApp.report(
      'SELECT Criteria, CampaignId, CampaignName, CampaignStatus, AdGroupId, AdGroupName, AdGroupStatus, Impressions, Clicks, AverageCpc ' +
      'FROM KEYWORDS_PERFORMANCE_REPORT ' +
      'WHERE CampaignStatus=ENABLED and AdGroupStatus=ENABLED ' +
      'DURING YESTERDAY');
    var search_campaigns = AdWordsApp.campaigns().withCondition("AdvertisingChannelType = SEARCH").get();
    while (search_campaigns.hasNext()) {
      var search_campaign = search_campaigns.next();
      campaign_ids_map[search_campaign.getName()] = search_campaign.getId();
    }
  } else if (type == 'shopping') {
    // Generate report
    var report = AdWordsApp.report(
      'SELECT CampaignId, CampaignName, CampaignStatus, AdGroupId, AdGroupName, AdGroupStatus, Impressions, Clicks, AverageCpc ' +
      'FROM SHOPPING_PERFORMANCE_REPORT ' +
      'WHERE CampaignStatus=ENABLED and AdGroupStatus=ENABLED ' +
      'DURING YESTERDAY'); 
    var shopping_campaigns = AdWordsApp.shoppingCampaigns().get();
    while (shopping_campaigns.hasNext()) {
  var shopping_campaign = shopping_campaigns.next();
  campaign_ids_map[shopping_campaign.getName()] = shopping_campaign.getId();  
    }
  }

  var rows = report.rows();
  var now = new Date();
  var timeZone = AdWordsApp.currentAccount().getTimeZone();
  var yesterday = Utilities.formatDate(new Date(now.getTime() - MILLIS_PER_DAY), timeZone, 'MM/dd/yyyy');
  var hasValidRows = false;
  while (rows.hasNext()) {
    var row = rows.next();
    var keyWordName = '';
    if (type == 'search') {
      keyWordName = row['Criteria'];
      keyWordName = keyWordName.replace(/,/g,'');
    }
    var campaignName = row['CampaignName'];
    campaignName = campaignName.replace(/,/g,'');
    var campaignId = row['CampaignId'];
    if (campaign_ids_map[campaignName] == undefined) {
      continue; 
    }
    var adGroupId = row['AdGroupId'];
    var adGroupName = row['AdGroupName'];
    adGroupName = adGroupName.replace(/,/g,'');
    var clicks = row['Clicks'];
    var impressions = row['Impressions'];
    var cpc = row['AverageCpc'];
    cpc = cpc.replace(/,/g,'');
    var cost = cpc * clicks;
    var result = [yesterday, keyWordName, campaignId, campaignName, adGroupId, adGroupName, impressions, clicks, cost, timeZone];
    hasValidRows = true;
    csv += '\n' + result.join(',');
  }

  if(RECIPIENT_EMAIL && hasValidRows == true) {
    var reportName = 'adwords_'+ type + '_report_' + AdWordsApp.currentAccount().getCustomerId();
    var compressedCSV = Utilities.zip([Utilities.newBlob(csv,'application/octet-stream').setName(reportName + '.csv')], reportName +'.zip');

    MailApp.sendEmail(
      RECIPIENT_EMAIL,
      'Adwords search performance report',
      '',
      {attachments:compressedCSV}
    );
  }
}
  
