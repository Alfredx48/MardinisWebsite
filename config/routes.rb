Rails.application.routes.draw do
  namespace :api do
    resources :users
    resources :ingredient_items
    resources :cart_items
    resources :carts
    resources :order_items
    resources :menu_items
    resources :orders
    resources :ingredients
    resources :restaurants, only: [:index, :show]
    get "/me", to: "users#show"
    post "/signup", to: "users#create"
    post "/login", to: "sessions#create"
    delete "/logout", to: "sessions#destroy"
  end
  # get "*path",
  #     to: "fallback#index",
  #     constraints: ->(req) { !req.xhr? && req.format.html? }
  # get "/auth/:provider/callback" => "sessions#omniauth"
end


