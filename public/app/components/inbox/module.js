define([
  'angular',
  'angular-couch-potato',
  'lodash',
  'angular-ui-router',
  'angular-resource'
], function(ng, couchPotato, _) {

  'use strict';

  var module = ng.module('app.inbox', ['ui.router', 'ngResource']);

  couchPotato.configureApp(module);

  module.filter('filesize', function() {
    var units = [
      'bytes',
      'KB',
      'MB',
      'GB',
      'TB',
      'PB'
    ];

    return function(bytes, precision) {
      if (isNaN(parseFloat(bytes)) || !isFinite(bytes)) {
        return '?';
      }

      var unit = 0;

      while (bytes >= 1024) {
        bytes /= 1024;
        unit ++;
      }

      return bytes.toFixed(precision) + ' ' + units[unit];
      }
  });

  module.config(['$stateProvider', '$couchPotatoProvider',function($stateProvider, $couchPotatoProvider) {
    
    $stateProvider
      .state('app.inbox', {
        url: '/inbox',
        data: {
          title: 'Inbox'
        },
        views: {
          content: {
            templateUrl: 'app/components/inbox/views/inbox-layout.tpl.html',
            controller: function($scope, config) {
              $scope.config = config.data;
              $scope.deleteSelected = function() {
                $scope.$broadcast('$inboxDeleteMessages');
              }
            },
            controllerAs: 'inboxCtrl',
            resolve: {
              deps: $couchPotatoProvider.resolveDependencies([
                'components/inbox/directives/message-labels'
              ]),
              config: function(InboxConfig) {
                return InboxConfig;
              }
            }
          }
        }
      })
      .state('app.inbox.folder', {
        url: '/:folder',
        views: {
          inbox: {
            templateUrl: 'app/components/inbox/views/inbox-folder.tpl.html',
            controller: function($scope, messages, $stateParams) {
              $scope.$parent.selectedFolder = _.find($scope.$parent.config.folders, {key: $stateParams.folder});
              $scope.messages = messages;
              $scope.$on('$inboxDeleteMessages', function(event) {
                angular.forEach($scope.messages, function(message, idx){
                  if (message.selected) {
                    message.$delete(function() {
                      $scope.messages.splice(idx, 1);
                    })
                  }
                });
              });
            },
            resolve: {
              messages: function(InboxMessage, $stateParams) {
                return InboxMessage.query({folder: $stateParams.folder});
              }
            }
          }
        }
      })
      .state('app.inbox.folder.detail', {
        url: '/detail/:message',
        views: {
          'inbox@app.inbox': {
            templateUrl: 'app/components/inbox/views/inbox-detail.tpl.html',
            controller: function($scope, message) {
              $scope.message = message;
            },
            resolve: {
              message: function(InboxMessage, $stateParams) {
                return InboxMessage.get({id: $stateParams.message})
              }
            }
          }
        }
      })
      .state('app.inbox.folder.reply', {
        url: '/reply/:message',
        views: {
          'inbox@app.inbox': {
            templateUrl: 'app/components/inbox/views/inbox-reply.tpl.html',
            controller: function($scope, $timeout, $state, replyTo) {
              $scope.replyTo = replyTo;
              $scope.sending = false;
              $scope.send = function() {
                $scope.sending = true;
                $timeout(function() {
                  $state.go('app.inbox.folder');
                }, 1000);
              }
            },
            controllerAs: 'replyCtrl',
            resolve: {
              deps: $couchPotatoProvider.resolveDependencies([
                'modules/forms/directives/input/smart-select2',
                'modules/forms/directives/editors/smart-summernote-editor'
              ]),
              replyTo: function (InboxMessage, $stateParams) {
                return InboxMessage.get({id: $stateParams.message});
              }
            }
          }
        }
      });
  }]);

  module.run(function($couchPotato) {
    module.lazy = $couchPotato;
  });

  return module;
});