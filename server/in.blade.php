@extends("front.partial.main")
@section("content")

@php
  $show_login_form_first = true;
  if(isset($settings_result['user_login_form_mode']) && !empty($settings_result['user_login_form_mode']) && $settings_result['user_login_form_mode'] == 'signup'){
    $show_login_form_first = false;
  }

  $is_10digit_login = false;
    if($extra_fields->contains('extra_column', 'mobile_number_10')){
       $desired_object = $extra_fields->filter(function($item) {
           return $item->extra_column == 'mobile_number_10';
       })->first();

       if($desired_object->status){
          $is_10digit_login = true;
       }
    }

    $referrer_source = "";
if(isset($_REQUEST['referrer']) && !empty($_REQUEST['referrer'])){
         $referrer_source = strtolower($_REQUEST['referrer']);
      }
@endphp
<style type="text/css">
    .dropdown-box{float:left;overflow:hidden}
    .dropdown-box .dropbtnbox{font-size:16px;border:none;outline:none;padding:5px 16px;background-color:inherit;font-family:inherit;margin:0;text-decoration: none; border: 1px solid transparent; -webkit-border-radius: 3px; border-radius: 3px; cursor: pointer; -webkit-font-smoothing: antialiased!important; outline-color: rgba(0,78,255,0.5); text-shadow: 1px 1px 1px rgb(0 0 0 / 0%); -webkit-user-select: none; -webkit-tap-highlight-color: rgba(0,0,0,0); box-shadow: 0 0 0 0.5px rgba(50,50,93,.17), 0 2px 5px 0 rgba(50,50,93,.1), 0 1px 1.5px 0 rgba(0,0,0,.07), 0 1px 2px 0 rgba(0,0,0,.08), 0 0 0 0 transparent!important;margin:10px;}
    .dropdown-content{display:none;position:absolute;background-color:#f9f9f9;min-width:160px;box-shadow:0 8px 16px 0 rgba(0,0,0,0.2);z-index:9999999;bottom:30px;max-width: 100%;}
    .dropdown-content a{float:none;color:#000;padding:12px 16px;text-decoration:none;display:block!important;text-align:left;padding: 10px;font-size: 15px;transition:display 0.3s linear,opacity 0.3s linear;}
    .dropdown-content a:hover{background-color:#ddd}
    .dropdown-box img{max-width: 20px;display: inline-block;margin-right: 10px;float: left; width: 20px;}
    .dropdown-box:hover .dropdown-content{display:inline-grid;animation: popup 0.2s;}
    .swal2-popup .swal2-title{font-size: 20px;}
    .swal2-title span, .swal2-title b{font-size: 24px!important;}
    @media(max-width: 486px){
      .dropdown-content{right: 25%;bottom: 145px;}
    }
    @keyframes popup {
  0%{
    transform: scale(1);
  }
  
  50%{
    transform: scale(1.1);
  }
 
  100%{
    transform: scale(1);
  }
}
</style>
<div class="page-content main-page">
    <div class="container">
      <div class="page-content-inner">
        <div class="register-area">
          <div class="register-box sign-in {{ ($show_login_form_first) ? '' : 'hide' }}">
             <div class="register-box-inner">
              <h3>Login Now</h3>
            </div>
          <form id="log-form">
            <ul>
            @if(isset($settings_result['login_with']) && $settings_result['login_with']=="email")
            <li>
              <div class="inputWithIcon">
                    <input type="text" tabindex="1" placeholder="{{isset($settings_result['login_with'])?($settings_result['login_with']=='email')?'Email Address':'Mobile number':''}}" name="email" id="login-email">
                    <i class="fa fa-envelope fa-lg fa-fw" aria-hidden="true"></i>
              </div>
            </li>
            @else
            <li>
              <div class="inputWithIcon">
                    
                     @if($is_10digit_login)
                          <input type="text" pattern="[1-9]{1}[0-9]{9}" maxlength="10" minlength="10" tabindex="1" placeholder="{{isset($settings_result['login_with'])?($settings_result['login_with']=='email')?'Email Address':'Mobile number':''}}" name="mobile-number" id="mobile-number">
                       @else
                        <input type="text" tabindex="1" placeholder="{{isset($settings_result['login_with'])?($settings_result['login_with']=='email')?'Email Address':'Mobile number':''}}" name="mobile-number" id="mobile-number">

                       @endif
                    <i class="fa fa-phone fa-lg fa-fw" aria-hidden="true"></i>
              </div>
            </li>
            @endif
            <!-- @if(isset($settings_result['login_with']) && $settings_result['login_with']=="mobile_number")

            @endif -->
<!--
             <li>
              <div class="inputWithIcon">
                    <input type="text" placeholder="{{isset($settings_result['login_with'])?($settings_result['login_with']=='email')?'Email Address':'Mobile number':''}}" name="email" id="login-email">
                    <i class="fa fa-envelope fa-lg fa-fw" aria-hidden="true"></i>
              </div>
            </li> -->
              @foreach ($extra_fields as $extra_field)
                @if($extra_field->status)
                  @if($extra_field->id == 1)
                    @if($extra_field->extra_column_datatype == 'password')
                      <li>
                        <div class="inputWithIcon">
                          <input type="text" name="login_extra_field1" placeholder="{{ $extra_field->extra_column }}" id="login_extra_field1">
                          <i class="fa {{ $extra_field->icon_class }} fa-lg fa-fw" aria-hidden="true"></i>
                        </div>
                      </li>
                    @endif
                  @endif
                @endif
              @endforeach

              <li><a class="button" tabindex="2" title="Login" id="login-btn">Login</a></li>
              <li class="addToCalenderBoxHtml" style="display: none;">
                  <div style="width: 100%;text-align: center;display: inline-grid;">
                      <div class="dropdown-box">
                        <button class="dropbtnbox">
                          <img src="{{ asset('assets/front/images/site_images/' . 'icon-calendar.svg') }}">
                            <span style="display: inline-block;">Add To Calender</span> 
                        </button>
                        <div class="dropdown-content">
                            <a class="" target="black" href="{{ route('addToCalender', ['google']) }}" style="text-decoration: none;">
                              <img src="{{ asset('assets/front/images/site_images/' . 'icon-google.svg') }}">
                              Google
                            </a>
                            <a class="" target="black" href="{{ route('addToCalender', ['outlook']) }}" style="text-decoration: none;">
                              <img src="{{ asset('assets/front/images/site_images/' . 'icon-outlookcom.svg') }}">
                              Outlook</a>
                            <a class="" target="black" href="{{ route('addToCalender', ['ios']) }}" style="text-decoration: none;">
                              <img src="{{ asset('assets/front/images/site_images/' . 'icon-apple.svg') }}">
                              Apple / iOs
                            </a>
                            <a class="" target="black" href="{{ route('addToCalender', ['yahoo']) }}" style="text-decoration: none;">
                              <img src="{{ asset('assets/front/images/site_images/' . 'icon-yahoo.svg') }}">
                              Yahoo
                            </a>
                        </div>
                    </div> 
                  </div>
              </li>
           </ul>
         </form>
          </div>


          <div class="register-box sign-up   {{ ($show_login_form_first) ? 'hide' : '' }}">
             <div class="register-box-inner">
              <h3>Register Now</h3>
             </div>
            @if ($errors->any())
              <div class="error-message-wrapper">
                  <p>{{ __('Please solve following errors:') }}</p>
                  <ul class="errors">
                      @forEach($errors->all() as $error)
                      <li>{{ $error }}</li>
                      @endforeach
                  </ul>
              </div>
            @endif
            <ul>

              <form id="user">
                @csrf

                @if(!empty($referrer_source))
                <input value="{{ $referrer_source }}" name="referrer_source" type="hidden" />
                @endif
                @if(isset($settings_result['display_prefix']) && $settings_result['display_prefix']==1)
                <li style="display: flex !important;margin: 0 0 7px !important;">
                  @if(isset($settings_result['label_prefix']) && !empty($settings_result['label_prefix']))
                  <p>
                    <input type="radio" id="dr" name="name_prifix" value="{{$settings_result['label_prefix']}}">
                    <label for="dr">{{$settings_result['label_prefix']}}</label>
                  </p>
                @endif
                <p>
                  <input type="radio" id="mr" name="name_prifix" value="Mr.">
                  <label for="mr">Mr.</label>
                </p>
                <p>
                  <input type="radio" id="ms" name="name_prifix" value="Ms.">
                  <label for="ms">Ms.</label>
                </p>
                <p>
                  <input type="radio" id="mrs" name="name_prifix" value="Mrs.">
                  <label for="mrs">Mrs.</label>
                </p>

              </li>
                 @else
              <input class="with-gap" value="" id="" name="name_prifix" type="hidden" />
              @endif
              @foreach ($extra_fields as $extra_field)
                @if($extra_field->is_dynamic_field == 0)
                  @if($extra_field->extra_column == 'full_name')
                    <li>
                      <div class="inputWithIcon">
                        <input type="text" name="name" placeholder="Full Name *" tabindex="" required>
                        <i class="fa {{ $extra_field->icon_class }} fa-lg fa-fw" aria-hidden="true"></i>
                      </div>
                    </li>
                  @endif
                    <!-- <li>
                    <div class="inputWithIcon">
                      <input type="text" placeholder="Employee ID">
                      <i class="fa fa-user fa-lg fa-fw" aria-hidden="true"></i>
                    </div>
                  </li> -->
                  @if($extra_field->extra_column=='location' && $extra_field->status==1)
                  <li>
                    <div class="inputWithIcon">
                      <input type="text" name="location" placeholder="Location / City {{($extra_field->column_type=='compulsory')?'*':''}}"
                      {{($extra_field->column_type=='compulsory')?'required':""}} tabindex="">
                      <i class="fa {{$extra_field->icon_class}} fa-fw"></i>
                    </div>
                  </li>
                  @endif

                     @if($extra_field->extra_column=='location' && $extra_field->status==0)
                    <input type="hidden" class="form-control form-control-lg form-control-custom" name="location"
                      value="">
                    @endif

                  @if($extra_field->extra_column=='email')
                  @if($extra_field->status)
                  <li>
                    <div class="inputWithIcon">
                      <input type="text" name="email" placeholder="Email Address {{($extra_field->column_type=='compulsory')?'*':''}}" tabindex="" id="email" {{($extra_field->column_type=='compulsory')?'required':""}}>
                      <i class="fa {{$extra_field->icon_class}} fa-lg fa-fw" aria-hidden="true"></i>
                    </div>
                  </li>
                  @else
                    <input type="hidden" name="email" id="email">
                  @endif
                  @endif
                  @if( ($extra_field->status && $extra_field->extra_column == 'mobile_number') || ($extra_field->status && $extra_field->extra_column == 'mobile_number_10') )
                  @if($extra_field->status)
                  <li>
                    <div class="inputWithIcon">
                       @if($extra_field->extra_column == 'mobile_number_10')
                          <input type="text"  pattern="[1-9]{1}[0-9]{9}" maxlength="10" placeholder="Mobile Number {{($extra_field->column_type=='compulsory')?'*':''}}" name="phone" id="phone" tabindex=""  minlength="10" {{($extra_field->column_type=='compulsory')?'required':""}} >
                       @else
                       <input type="text" placeholder="Mobile Number {{($extra_field->column_type=='compulsory')?'*':''}}" name="phone" id="phone" tabindex=""  minlength="8"  maxlength="15"  {{($extra_field->column_type=='compulsory')?'required':""}} >
                       @endif

                      <i class="fa {{$extra_field->icon_class}} fa-lg fa-fw" aria-hidden="true"></i>


                    </div>
                  </li>
                  @else
                    <input type="hidden" name="phone" id="phone">
                  @endif
                  @endif

                 @else
                      @if($extra_field->status)
                        @if($extra_field->id == 1)
                          <li>
                              <div class="inputWithIcon">
                                <input type="text" name="{{$extra_field->extra_column}}" placeholder="{{ $extra_field->extra_column }} *" id="{{$extra_field->extra_column}}" tabindex="" required>
                                <i class="fa {{ $extra_field->icon_class }} fa-lg fa-fw" aria-hidden="true"></i>
                              </div>
                          </li>
                        @elseif($extra_field->id == 2)
                          <li>
                              <div class="inputWithIcon">
                                <input type="text" name="{{$extra_field->extra_column}}" placeholder="{{ $extra_field->extra_column }} {{($extra_field->column_type=='compulsory')?'*':''}}" id="{{$extra_field->extra_column}}" tabindex="" {{($extra_field->column_type=='compulsory')?'required':""}}>
                                <i class="fa {{ $extra_field->icon_class }} fa-lg fa-fw" aria-hidden="true"></i>
                              </div>
                          </li>
                            @elseif(in_array($extra_field->id,[11,12]))
                          <li>
                              <div class="inputWithIcon">
                                <input type="text" name="{{$extra_field->extra_column}}" placeholder="{{ $extra_field->extra_column }} {{($extra_field->column_type=='compulsory')?'*':''}}" id="{{$extra_field->extra_column}}" tabindex="" {{($extra_field->column_type=='compulsory')?'required':""}}>
                                <i class="fa {{ $extra_field->icon_class }} fa-lg fa-fw" aria-hidden="true"></i>
                              </div>
                          </li>


                          @elseif($extra_field->id == 10)

                            <li>
                              <div class="inputWithIcon">
                                <select name="{{$extra_field->extra_column}}">
                                  <option value="" disabled selected="">{{isset($settings_result['default_state'])?$settings_result['default_state']:"Select State"}}</option>
                                  @foreach($state as $key=>$value)
                                  <option value="{{$value['name']}}">{{$value['name']}}</option>
                                  @endforeach
                                 </select>

                                <i class="fa {{$extra_field->icon_class}} fa-lg fa-fw" aria-hidden="true"></i>
                              </div>
                            </li>


                    @elseif(in_array($extra_field->id,[13,14]))
                            <li>
                              <!-- New Feild -->
                              <div class="inputWithIcon">
                                <input type="text" class="form-control form-control-lg 
                                  form-control-custom" type="text"
                                  name="{{$extra_field->extra_column}}"
                                  placeholder="{{ $extra_field->extra_column }} {{($extra_field->column_type=='compulsory')?'*':''}}"
                                  id="{{$extra_field->extra_column}}" tabindex=""
                                  {{($extra_field->column_type=='compulsory')?'required':""}}>
                                <i class="fa {{ $extra_field->icon_class }} env fa-lg fa-fw" aria-hidden="true"></i>
                              </div>
                            </li>
                        @else
                          @if(!empty($extra_field->extra_column_value))
                              <!-- <li style="font-size: 14px;/*display: block !important;margin: 0 0 7px !important;*/text-align: left">

                                @if(!in_array($extra_field->id,[4,5]))
                                  <label style="color: var(--primaryColor)">{{$extra_field->extra_column}}</label>
                                @endif
                                @foreach(explode(',', $extra_field->extra_column_value) as $info)
                                   @if(!in_array($extra_field->id,[4,5]))
                                        <p>
                                            <input type="radio" id="{{$info}}" name="{{$extra_field->extra_column}}" value="{{$info}}" ><label for="{{$info}}">{{$info}}</label>
                                        </p>
                                    @endif
                                @endforeach
                              </li> -->

                                <li style="font-size: 14px; text-align: left">
                                  @if(!in_array($extra_field->id,[4,5]))
                                      <select name="{{$extra_field->extra_column}}" id="{{$extra_field->extra_column}}" class="degree" style="width: 100%; padding: 5px; margin-top: 5px;">
                                          <option value="">-- Select Degree--</option>
                                          @foreach(explode(',', $extra_field->extra_column_value) as $info)
                                              <option value="{{$info}}">{{$info}}</option>
                                          @endforeach
                                      </select>
                                  @endif
                                </li>

                                <!-- @if($extra_field->id==5)
                                <li>
                                  <div class="inputWithIcon">
                                    <select name="{{$extra_field->extra_column}}">
                                      <option value="" {{($extra_field->column_type=='compulsory')?'disabled':""}} selected="">{{isset($settings_result['default_speciality'])?$settings_result['default_speciality']:""}}</option>
                                      @foreach(explode(',', $extra_field->extra_column_value) as $info)
                                            <option value="{{$info}}">{{$info}}</option>
                                      @endforeach
                                    </select>
                                    <i class="fa {{ $extra_field->icon_class }} fa-lg fa-fw" aria-hidden="true"></i>
                                  </div>
                                </li>
                                @endif -->
                                @if($extra_field->id==5)
                              <li>
                                <div class="inputWithIcon">
                                  <select name="{{$extra_field->extra_column}}" id="instituteSelect">
                                    <option value="" {{($extra_field->column_type=='compulsory')?'disabled':""}} selected>
                                      {{ isset($settings_result['default_speciality']) ? $settings_result['default_speciality'] : "" }}
                                    </option>
                                    @foreach(explode(',', $extra_field->extra_column_value) as $info)
                                      <option value="{{$info}}">{{$info}}</option>
                                    @endforeach
                                    <option value="OTHERS">OTHERS</option>
                                  </select>
                                  <i class="fa {{ $extra_field->icon_class }} fa-lg fa-fw" aria-hidden="true"></i>
                                </div>

                                <!-- Hidden input for custom institute -->
                                <div id="customInstituteDiv" style="display:none; margin-top:5px;">
                                  <input type="text" id="customInstitute" placeholder="Enter Institute Name">
                                </div>
                              </li>
                              @endif

                                @if($extra_field->id==4)
                                <li>
                                  <div class="inputWithIcon">
                                  <select name="{{$extra_field->extra_column}}">
                                    <option value="" {{($extra_field->column_type=='compulsory')?'disabled':""}} selected="">{{isset($settings_result['default_value_4'])?$settings_result['default_value_4']:""}}</option>
                                    @foreach(explode(',', $extra_field->extra_column_value) as $info)
                                          <option value="{{$info}}">{{$info}}</option>
                                     @endforeach
                                  </select>
                                   <i class="fa {{ $extra_field->icon_class }} fa-lg fa-fw" aria-hidden="true"></i>
                                 </div>
                              </li>
                                @endif

                          @endif
                      @endif
                  @endif
                  @endif
              @endforeach
                <li style="font-size: 14px; text-align: left">
                  <select name="year" id="year" style="width: 100%; padding: 5px; margin-top: 5px;" required>
                      <option value="">-- Select Year --</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="Resident">Resident</option>
                      <option value="Faculty (HOD)">Faculty (HOD)</option>
                      <option value="Faculty (Professor)">Faculty (Professor)</option>
                      <option value="Faculty (Assistant Professor)">Faculty (Assistant Professor)</option>
                  </select>
              </li>
           @if(isset($settings_result['term_condition']) && !empty($settings_result['term_condition']) && !in_array($settings_result['term_condition'],[
           '<p style="text-align: left; line-height: 1.4;"><br></p>'
           ]))
            <!--   <li style="display: flex !important;">
                <input type="checkbox" value="term" name="term_condition" id="is_term_condition">
                 &nbsp; &nbsp;<label for="is_term_condition" style="color: black;font-size:14px !important">{!! $settings_result['term_condition'] !!}</label>

              </li> -->
              <li style="display: flex !important;margin: 0 0 7px !important;text-align:left !important" id="label_term">
                <p class="term" style="margin: 0px 10px 0 0">
                  <input type="checkbox" id="is_term_condition" tabindex="-1" name="term_condition" value="term">
                  <label for="is_term_condition" style="color:color: var(--primaryColor) !important;">{!! $settings_result['term_condition'] !!}

                  @if(isset($settings_result['term_condition_long']) && !empty($settings_result['term_condition_long']))
                  <a href="javascript:void(0)" id="term-readmore" data-message="{{ $settings_result['term_condition_long'] }}" data-toggle="modal" data-target="#term-long-modal">Read More...</a>
                  @endif

                  </label>
                </p>
              </li>
            @endif
               <li><a class="button" title="Sign Up" id="sign-up-btn">Register</a></li>
              <li style="color:var(--primaryColor);font-size: 14px;">If already registered ?<a href="#" onclick="login();"> Click here.</a></li>

            </form>
            </ul>
          </div>
          <div class="visit-box">
            <!-- <img src="images/play.png" alt="image"> -->
            <!-- <span><i class="fa fa-play-circle-o" aria-hidden="true"></i></span><p> Visit us at 10 AM</p> -->
          </div>
        </div>
        <div class="chat-box-display" style="background: none;">
          <div class="chat-box-inner" style="background: none;">
            @if(!empty($settings_result["right_image"]))
            <img src="{{asset('assets/front/images')."/site_images/".(isset($settings_result["right_image"])?$settings_result["right_image"]:"")}}" alt="image"/>
            @endif
          </div>
        </div>
      </div>
    </div>
</div>
<div class="modal fade" id="term-long-modal" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Modal title</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body" id="term_modal_body">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary">Save changes</button>
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>
@endsection
@section('header')
<style>

.hide{
  display: none !important;
}
#label_term p{
  color: var(--primaryColor) !important;
}
@media(max-height: 768px){
  .register-box{
    max-height: 450px;
    overflow: auto;
  }
}
</style>
@endsection
@section('footer')
<!-- <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script> -->
<script>
$(document).ready(function(){
  window.addToCalenderHtml = $('.addToCalenderBoxHtml').html();
  
  @if($is_10digit_login)
     $("#phone").keypress(function(e){
        if(e.which !=8 && e.which !=0 && (e.which<48 || e.which>57)){
              return false;
        }
     });
  @else
      $("#phone").keypress(function(e){
        if(e.which !=8 && e.which !=0 && (e.which<48 || e.which>57)){
              return false;
        }
      });
  @endif

   

  $(".login_page").on("click",function(){
    $(".sign-up").addClass("hide");
    $(".sign-in").removeClass("hide");
  });

$("#login-email").keypress(function(event) {
     if (event.which == 13) {
         event.preventDefault();
         $("#login-btn").click();
     }
 });

$("#user").keypress(function(event) {
     if (event.which == 13) {
         event.preventDefault();
         $("#sign-up-btn").click();
     }
 });

$("#term-readmore").click(function(){
  var message = $(this).attr("data-message");
  if(message !== ''){
    swal.fire({
      title:"Terms & Condition",
      html: message
    });
  }
})



$(document).on("click", "#login-btn", function () {
            // validateTermsAndCondtion();
            var data_="";
            var email_="{{isset($settings_result['login_with'])?$settings_result['login_with']:''}}";

            var login_extra_field1 = $("#login_extra_field1").val();
            var _token = "{{ csrf_token() }}";

            @if($is_10digit_login)
               if($("#mobile-number").length > 0 && $("#mobile-number").val().length < 10){
                  Swal.fire({
                       title: "Mobile Number should be 10 digits.",
                       type: 'warning'
                   });
                  return false;
               }
            @endif

            if(email_=="email"){
              var email = $("#login-email").val();
              data_={email: email, login_extra_field1: login_extra_field1, _token: _token};
            }

            if(email_=="mobile_number"){
              var phone=$("#mobile-number").val();
             data_={phone: phone, login_extra_field1: login_extra_field1, _token: _token};
            }



            if (email != "") {

                var html1="";
                $.ajax({
                    type: "POST",
                    url: "{{route('do_login')}}",
                    data: data_,
                    success: function (data) {
                        if (typeof data.message != "undefined" && typeof data.email != "undefined" && typeof data.status!=false) {
                            $(".sign-in").addClass("hide");
                            $(".sign-up").removeClass("hide");

                            if(email_=="email"){
                              $("#email").val(data.email);
                            }

                            if(email_=="mobile_number"){
                              $("#phone").val(data.email);
                            }
                        }else if(typeof data.message != "undefined" && typeof data.status != true){
                            $.each(data.message, function (i1, val1) {
                                html1 += val1;
                                html1 += "\n";
                            });
                            Swal.fire({
                                title: html1,
                                type: 'warning'
                            });
                        } else {
                            window.location.href=data.url;
                        }
                    }
                });
            } else {
                Swal.fire({
                    title: "Email address is required.",
                    type: 'warning'
                });
            }
        });

});

$(document).ready(function() {
    $('#instituteSelect').on('change', function() {
        if ($(this).val() === 'OTHERS') {
            $('#customInstituteDiv').show();
            $('#customInstitute').attr('required', true);
        } else {
            $('#customInstituteDiv').hide();
            $('#customInstitute').attr('required', false);
            $('#customInstitute').val(''); // Clear the custom input
        }
    });
});

$(document).on("click", "#sign-up-btn", function () {
    // Terms and Conditions Check
    if($("#is_term_condition").length){
        var agreeCheckbox = document.getElementById('is_term_condition').checked;
        if(agreeCheckbox == false) {
            alert('Please Agree Terms & Condition');
            return false;
        }
    }
    
    var phone = $("#phone").val();

    // Check 10-digit mobile number validation if enabled
    @if($is_10digit_login)
        if($("#phone").length > 0 && $("#phone").val().length < 10){
          Swal.fire({
                title: "Mobile Number should be 10 digits.",
                type: 'warning'
            });
          return false;
        }
    @endif

    // Handle Institute / Speciality - REPLACE "OTHERS" with custom value BEFORE serialization
    var instituteSelect = $("select[name='{{ $extra_fields->where('id',5)->first()->extra_column ?? '' }}']");
    if(instituteSelect.length) {
        var instituteValue = instituteSelect.val();
        
        if(instituteValue === 'OTHERS') {
            var customValue = $('#customInstitute').val().trim();
            if(customValue === '') {
                Swal.fire({
                    title: "Please enter your Institute name.",
                    icon: 'warning'
                });
                return false;
            }
            // --- START OF FIX ---
            // एक नया ऑप्शन बनाएं और उसे चुनें।
            // new Option(text, value, defaultSelected, selected)
            // यह ड्रॉपडाउन में एक नया ऑप्शन जोड़ देगा और उसे तुरंत सिलेक्ट कर लेगा।
            var newOption = new Option(customValue, customValue, true, true);
            instituteSelect.append(newOption);
            // --- END OF FIX ---
        } else if(!instituteValue || instituteValue.trim() === "") {
            // Only check for empty if it's not "OTHERS"
            Swal.fire({
                title: "Please select your Institute / Speciality.",
                icon: 'warning'
            });
            return false;
        }
    }

    // Validate Degree (class=degree)
    var degreeSelect = $(".degree");
    if(degreeSelect.length && (!degreeSelect.val() || degreeSelect.val().trim() === "")) {
        Swal.fire({
            title: "Please select your Degree.",
            icon: 'warning'
        });
        return false;
    }

    // Validate Year (id=year)
    var yearSelect = $("#year");
    if(yearSelect.length && (!yearSelect.val() || yearSelect.val().trim() === "")) {
        Swal.fire({
            title: "Please select your Year.",
            icon: 'warning'
        });
        return false;
    }

    // IMPORTANT: Serialize form data AFTER all value replacements
    var data = $("#user").serialize();
    var html = "";
    
    console.log("Form data being sent:", data); // Debug log
    
    if (data != "") {
        $("#sign-up-btn").text("Please wait...");
        $.ajax({
            type: "POST",
            url: "{{route('do_sign_up')}}",
            data: data,
            success: function (data) {
                console.log("Response received:", data);
                $(".sign-in").addClass("hide");
                $(".sign-up").removeClass("hide");
                $("#sign-up-btn").text("Register");
                
                if (typeof data.message != "undefined") {
                    $.each(data.message, function (i, val) {
                        html += val;
                        html += "\n";
                    });
                    Swal.fire({
                        title: html,
                        type: 'warning'
                    });
                } else {
                    $("#sign-up-btn").text("Register");
                    
                    if(data.welcome_message != "") {
                        if (data.display_AddToCalender && data.display_AddToCalender == 1) {
                            Swal.fire({
                                title: data.welcome_message, 
                                html: "Add this event to your calendar<br>" + addToCalenderHtml,  
                                confirmButtonText: "Close", 
                                onClose: () => {
                                    if(typeof(data.URL) !== 'undefined'){
                                        window.location.href = data.URL;
                                    }
                                }
                            });
                        } else {
                            let timerInterval
                            Swal.fire({
                                title: '',
                                html: data.welcome_message,
                                timer: 2000,
                                timerProgressBar: true,
                                onBeforeOpen: () => {
                                    Swal.showLoading()
                                    timerInterval = setInterval(() => {}, 100)
                                },
                                onClose: () => {
                                    clearInterval(timerInterval)
                                }
                            }).then((result) => {
                                if (result.dismiss === Swal.DismissReason.timer) {
                                    if(typeof(data.URL) !== 'undefined'){
                                        window.location.href = data.URL;
                                    }
                                }
                            })
                        }
                    } else {
                        if(typeof(data.URL) !== 'undefined'){
                            window.location.href = data.URL;
                        }
                    }
                }
            },
            error: function(xhr, status, error) {
                console.error("AJAX Error:", error);
                $("#sign-up-btn").text("Register");
                Swal.fire({
                    title: "An error occurred. Please try again.",
                    type: 'error'
                });
            }
        });
    } else {
        Swal.fire({
            title: "All fields are required.",
            type: 'warning'
        });
    }
});

// $(document).ready(function() {
//     $('#instituteSelect').on('change', function() {
//         if ($(this).val() === 'OTHERS') {
//             $('#customInstituteDiv').show();
//             $('#customInstitute').attr('required', true);
//         } else {
//             $('#customInstituteDiv').hide();
//             $('#customInstitute').attr('required', false);
//         }
//     });

//     // On signup, if OTHERS is selected, replace the value with the input value
//     $('#sign-up-btn').on('click', function(e) {
//         var instituteSelect = $('#instituteSelect');
//         if(instituteSelect.val() === 'OTHERS') {
//             var customValue = $('#customInstitute').val().trim();
//             if(customValue === '') {
//                 Swal.fire({
//                     title: "Please enter your Institute name.",
//                     icon: 'warning'
//                 });
//                 return false;
//             }
//             // Replace the dropdown value with the custom value before submitting
//             instituteSelect.val(customValue);
//         }
//     });
// });


// $(document).on("click", "#sign-up-btn", function () {
//             if($("#is_term_condition").length){

//             validateTermsAndCondtion();
//             }
//             var data = $("#user").serialize();
//             var phone=$("#phone").val();

//             @if($is_10digit_login)
//                if($("#phone").length > 0 && $("#phone").val().length < 10){
//                   Swal.fire({
//                        title: "Mobile Number should be 10 digits.",
//                        type: 'warning'
//                    });
//                   return false;
//                }
//             @endif

//             // Validate Institute / Speciality (id==5)
//             // var instituteSelect = $("select[name='{{ $extra_fields->where('id',5)->first()->extra_column ?? '' }}']");
//             // if(instituteSelect.length && (!instituteSelect.val() || instituteSelect.val().trim() === "")) {
//             //     Swal.fire({
//             //         title: "Please select your Institute / Speciality.",
//             //         icon: 'warning'
//             //     });
//             //     return false;
//             // }

//             // Validate Institute / Speciality
//             var instituteSelect = $("select[name='{{ $extra_fields->where('id',5)->first()->extra_column ?? '' }}']");
//             var instituteValue = instituteSelect.val();

//             if(instituteValue === 'OTHERS') {
//                 var customValue = $('#customInstitute').val().trim();
//                 if(customValue === '') {
//                     Swal.fire({
//                         title: "Please enter your Institute name.",
//                         icon: 'warning'
//                     });
//                     return false;
//                 }
//                 instituteValue = customValue; // use custom input for submission
//             } 

//             if(!instituteValue || instituteValue.trim() === "") {
//                 Swal.fire({
//                     title: "Please select your Institute / Speciality.",
//                     icon: 'warning'
//                 });
//                 return false;
//             }

//             // Validate Degree (class=degree)
//             var degreeSelect = $(".degree");
//             if(degreeSelect.length && (!degreeSelect.val() || degreeSelect.val().trim() === "")) {
//                 Swal.fire({
//                     title: "Please select your Degree.",
//                     icon: 'warning'
//                 });
//                 return false;
//             }

//             // Validate Year (id=year)
//             var yearSelect = $("#year");
//             if(yearSelect.length && (!yearSelect.val() || yearSelect.val().trim() === "")) {
//                 Swal.fire({
//                     title: "Please select your Year.",
//                     icon: 'warning'
//                 });
//                 return false;
//             }

//             var html = "";
//             if (data != "") {
//                 //phone number validation remaining
//     //
//     //                if(phone.length < 8 || phone.length>10){
//     //                    Swal.fire({
//     //                        title: "Phone Validation failed",
//     //                        type: 'warning'
//     //                    });
//     //                    return false;
//     //                }
//                     $("#sign-up-btn").text("Please wait...");
//                     $.ajax({
//                         type: "POST",
//                         url: "{{route('do_sign_up')}}",
//                         data: data,
//                         success: function (data) {
//                          // return false;
//                           console.log("1-------------");
//                             console.log(data);
//                             $(".sign-in").addClass("hide");
//                             $(".sign-up").removeClass("hide");
//                             $("#sign-up-btn").text("Sign up");
//                             if (typeof data.message != "undefined") {
//                                 $.each(data.message, function (i, val) {
//                                     html += val;
//                                     html += "\n";
//                                 });
//                                 Swal.fire({
//                                     title: html,
//                                     type: 'warning'
//                                 });
//                             } else {
//                               $("#sign-up-btn").text("Sign up");
//                                 console.log("2-------------");
//                                 console.log(data);
//                                 console.log(data.welcome_message);
//                                   if(data.welcome_message!=""){
//                                       if (data.display_AddToCalender && data.display_AddToCalender == 1) {
//                                       Swal.fire({
//                                         title: data.welcome_message, 
//                                         html: "Add this event to your calendar<br>" + addToCalenderHtml,  
//                                         confirmButtonText: "Close", 
//                                          onClose: () => {
//                                             console.log('closed');
//                                             if(typeof(data.URL) !== 'undefined'){
//                                               window.location.href = data.URL;
//                                             }
//                                          }
//                                       });
//                                     }else{
//                                         let timerInterval
//                                         Swal.fire({
//                                           title: '',
//                                           html: data.welcome_message,
//                                           timer: 2000,
//                                           timerProgressBar: true,
//                                           onBeforeOpen: () => {
//                                             Swal.showLoading()
//                                             timerInterval = setInterval(() => {
//                                             }, 100)
//                                           },
//                                           onClose: () => {
//                                             clearInterval(timerInterval)
//                                           }
//                                         }).then((result) => {
//                                           /* Read more about handling dismissals below */
//                                           if (result.dismiss === Swal.DismissReason.timer) {
//                                             if(typeof(data.URL) !== 'undefined'){
//                                                 window.location.href = data.URL;
//                                               }
//                                           }
//                                         })
//                                     }
//                                   }else{
//                                     if(typeof(data.URL) !== 'undefined'){
//                                       window.location.href = data.URL;
//                                     }
//                                   }
//                             }
//                         }
//                     });

//             }else{

//                 Swal.fire({
//                     title: "All filed is required.",
//                     type: 'warning'
//                 });
//             }
//         });

//    function validateTermsAndCondtion() {
//       var agreeCheckbox = document.getElementById('is_term_condition').checked;
//       if(agreeCheckbox == false) {
//           alert('Please Agree Terms & Condition');
//           exit(0);
//       }
//   }

  function login() {
  	$(".sign-up").addClass("hide");
	$(".sign-in").removeClass("hide");
}

</script>
<script type="text/javascript">
      // To To Disable ctrl+c, ctrl+u
      jQuery(document).ready(function($){
        document.oncontextmenu = document.body.oncontextmenu = function() {return false;}
        $(document).keydown(function(event) {
          var pressedKey = String.fromCharCode(event.keyCode).toLowerCase();
          //console.log(pressedKey);
          // i, c, j  -> open inspect element view
          // ctr + u or c -> pag src
          // f12 - 123
          if ( event.which === 123 || (event.ctrlKey && (pressedKey == "c" || pressedKey == "u")) || (event.ctrlKey && event.shiftKey && (pressedKey == "i" || pressedKey == "c" || pressedKey == "j")    ) ) {
          //alert('Sorry, This Functionality Has Been Disabled!');
          //disable key press porcessing
          return false;
          }
        });
      });
    </script>
@endsection




