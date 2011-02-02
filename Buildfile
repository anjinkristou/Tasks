config :scui, :required => [:foundation, :calendar, :dashboard, :drawing, :linkit]
config :'core-tasks', :required => [:sproutcore, :scuds, :'scuds/local']
config :tasks, :required => [:'core-tasks', :ki, :sproutcore, :scui, :sai, :'sai/graphs'],:title=>"Tasks:Dev"
# config :tasks, :required => [:'core-tasks', :ki, :sproutcore, :scui, :sai, :'sai/graphs'],:title=>"Tasks:Demo"
# config :tasks, :required => [:'core-tasks', :ki, :sproutcore, :scui, :sai, :'sai/graphs'],:title=>"Tasks:SproutCore"
# config :tasks, :required => [:'core-tasks', :ki, :sproutcore, :scui, :sai, :'sai/graphs'],:title=>"Todos:Eloqua"

# Local Persevere server (prod instance)
proxy '/tasks-server', :to => 'localhost:8088', :protocol => 'http'

# Local Persevere server (test instance)
# proxy '/tasks-server', :to => 'localhost:8089', :protocol => 'http'

# Local GAE server (comment 'Persevere server' line above, uncomment next line & replace 8091 with port of GAE application)
# proxy '/tasks-server', :to => 'localhost:8091', :protocol => 'http'
